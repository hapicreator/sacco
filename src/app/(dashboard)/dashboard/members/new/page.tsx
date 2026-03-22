// FILE: src/app/(dashboard)/dashboard/members/new/page.tsx
// ACTION: NEW
//
// Add new member form. Admin or staff fills this in.
// Creates a profile (if user does not exist yet) and a member record.
// MVP approach: admin manually adds member details.

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, UserPlus, AlertCircle, CheckCircle, Loader2
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function NewMemberPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [success, setSuccess]     = useState(false)

  // Form fields
  const [fullName, setFullName]           = useState("")
  const [email, setEmail]                 = useState("")
  const [phone, setPhone]                 = useState("")
  const [nationalId, setNationalId]       = useState("")
  const [dob, setDob]                     = useState("")
  const [gender, setGender]               = useState("")
  const [occupation, setOccupation]       = useState("")
  const [nokName, setNokName]             = useState("")
  const [nokPhone, setNokPhone]           = useState("")
  const [notes, setNotes]                 = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    // Get current user's session and SACCO
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setError("You must be logged in."); setIsLoading(false); return }

    const { data: saccoUser } = await supabase
      .from("sacco_users")
      .select("sacco_id")
      .eq("user_id", session.user.id)
      .eq("is_active", true)
      .single()

    if (!saccoUser) { setError("Could not find your SACCO."); setIsLoading(false); return }

    const saccoId = saccoUser.sacco_id

    // Check member limit
    const { count: memberCount } = await supabase
      .from("members")
      .select("id", { count: "exact", head: true })
      .eq("sacco_id", saccoId)
      .eq("status", "active")

    const { data: saccoData } = await supabase
      .from("saccos")
      .select("max_members, name")
      .eq("id", saccoId)
      .single()

    if (memberCount !== null && saccoData && memberCount >= saccoData.max_members) {
      setError(`Your SACCO has reached its maximum of ${saccoData.max_members} members.`)
      setIsLoading(false)
      return
    }

    // Step 1: Check if a user with this email already exists in auth
    // For MVP, we create a profile directly without requiring them to sign up first.
    // We use a placeholder UUID for members added manually.
    // In production you would invite them via email.

    // Check if profile already exists with this email via sacco_users
    // For MVP: create a new auth user with a temporary password
    const tempPassword = `SACCO_${Math.random().toString(36).slice(2, 10).toUpperCase()}`

    const { data: authData, error: authError } = await supabase.auth.admin
      ? // If admin API available
        { data: null, error: { message: "use_signup" } }
      : { data: null, error: { message: "use_signup" } }

    // Use regular signup for MVP
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: email,
      password: tempPassword,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (signupError && !signupError.message.includes("already registered")) {
      setError(signupError.message)
      setIsLoading(false)
      return
    }

    let userId = signupData?.user?.id

    // If user already exists, find them
    if (signupError?.message.includes("already registered")) {
      setError("A user with this email already exists. Ask them to join using the SACCO code instead.")
      setIsLoading(false)
      return
    }

    if (!userId) {
      setError("Could not create user account. Please try again.")
      setIsLoading(false)
      return
    }

    // Step 2: Create or update profile
    await supabase.from("profiles").upsert({
      id:            userId,
      full_name:     fullName,
      phone:         phone || null,
      national_id:   nationalId || null,
      date_of_birth: dob || null,
      gender:        gender || null,
    })

    // Step 3: Add to sacco_users
    await supabase.from("sacco_users").insert({
      sacco_id: saccoId,
      user_id:  userId,
      role:     "member",
    })

    // Step 4: Generate membership number
    const { count: totalMembers } = await supabase
      .from("members")
      .select("id", { count: "exact", head: true })
      .eq("sacco_id", saccoId)

    const sequence = (totalMembers ?? 0) + 1
    const year     = new Date().getFullYear()
    const prefix   = (saccoData?.name ?? "SAC").slice(0, 3).toUpperCase()
    const memberNo = `${prefix}-${year}-${String(sequence).padStart(3, "0")}`

    // Step 5: Create member record
    const { error: memberError } = await supabase.from("members").insert({
      sacco_id:          saccoId,
      user_id:           userId,
      membership_number: memberNo,
      status:            "active",
      occupation:        occupation || null,
      next_of_kin_name:  nokName || null,
      next_of_kin_phone: nokPhone || null,
      notes:             notes || null,
    })

    if (memberError) {
      setError(memberError.message)
      setIsLoading(false)
      return
    }

    // Step 6: Create a default savings account for the member
    const { data: memberData } = await supabase
      .from("members")
      .select("id")
      .eq("sacco_id", saccoId)
      .eq("user_id", userId)
      .single()

    if (memberData) {
      await supabase.from("accounts").insert({
        sacco_id:       saccoId,
        member_id:      memberData.id,
        account_type:   "savings",
        account_number: `SAV-${memberNo}`,
        balance:        0,
        currency:       "UGX",
      })
    }

    setIsLoading(false)
    setSuccess(true)
  }

  // Success screen
  if (success) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-10 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-stone-900 mb-2"
              style={{ fontFamily: "var(--font-heading, serif)" }}>
            Member added!
          </h2>
          <p className="text-stone-500 text-sm mb-2">
            <span className="font-semibold text-stone-700">{fullName}</span> has been
            added as a member. A savings account has been created for them automatically.
          </p>
          <p className="text-stone-400 text-xs mb-8">
            They will receive an email to set up their login password.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/dashboard/members"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-green-700 hover:bg-green-800 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              View all members
            </Link>
            <button
              onClick={() => {
                setSuccess(false)
                setFullName(""); setEmail(""); setPhone("")
                setNationalId(""); setDob(""); setGender("")
                setOccupation(""); setNokName(""); setNokPhone(""); setNotes("")
              }}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border-2 border-green-700 text-green-700 hover:bg-green-50 text-sm font-semibold rounded-xl transition-colors"
            >
              Add another member
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20 lg:pb-6">

      {/* Header */}
      <div>
        <Link
          href="/dashboard/members"
          className="inline-flex items-center gap-1.5 text-stone-400 hover:text-stone-600 text-sm mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Members
        </Link>
        <h2 className="text-2xl font-bold text-stone-900"
            style={{ fontFamily: "var(--font-heading, serif)" }}>
          Add New Member
        </h2>
        <p className="text-sm text-stone-500 mt-0.5">
          Fill in the member details. A savings account will be created automatically.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Personal Information */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 space-y-4">
          <h3 className="font-semibold text-stone-900 text-base border-b border-stone-100 pb-3"
              style={{ fontFamily: "var(--font-heading, serif)" }}>
            Personal Information
          </h3>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Full name <span className="text-red-500">*</span>
            </label>
            <input type="text" required placeholder="e.g. Amina Nakato"
              value={fullName} onChange={(e) => setFullName(e.target.value)}
              className="input-field" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                Email address <span className="text-red-500">*</span>
              </label>
              <input type="email" required placeholder="member@example.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
                className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                Phone number
              </label>
              <input type="tel" placeholder="+256 700 000 000"
                value={phone} onChange={(e) => setPhone(e.target.value)}
                className="input-field" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                National ID (NIN)
              </label>
              <input type="text" placeholder="e.g. CM9200124698HJK"
                value={nationalId} onChange={(e) => setNationalId(e.target.value)}
                className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                Date of birth
              </label>
              <input type="date"
                value={dob} onChange={(e) => setDob(e.target.value)}
                className="input-field" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Gender</label>
              <select value={gender} onChange={(e) => setGender(e.target.value)}
                className="input-field">
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Occupation</label>
              <input type="text" placeholder="e.g. Teacher, Farmer, Trader"
                value={occupation} onChange={(e) => setOccupation(e.target.value)}
                className="input-field" />
            </div>
          </div>
        </div>

        {/* Next of Kin */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 space-y-4">
          <h3 className="font-semibold text-stone-900 text-base border-b border-stone-100 pb-3"
              style={{ fontFamily: "var(--font-heading, serif)" }}>
            Next of Kin <span className="text-stone-400 font-normal text-sm">(optional)</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Full name</label>
              <input type="text" placeholder="Next of kin name"
                value={nokName} onChange={(e) => setNokName(e.target.value)}
                className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Phone number</label>
              <input type="tel" placeholder="+256 700 000 000"
                value={nokPhone} onChange={(e) => setNokPhone(e.target.value)}
                className="input-field" />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 space-y-4">
          <h3 className="font-semibold text-stone-900 text-base border-b border-stone-100 pb-3"
              style={{ fontFamily: "var(--font-heading, serif)" }}>
            Additional Notes <span className="text-stone-400 font-normal text-sm">(optional)</span>
          </h3>
          <textarea
            rows={3}
            placeholder="Any additional notes about this member..."
            value={notes} onChange={(e) => setNotes(e.target.value)}
            className="input-field resize-none"
          />
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <Link
            href="/dashboard/members"
            className="flex-1 py-3 px-6 rounded-xl font-semibold text-sm border-2 border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors text-center"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 py-3 px-6 rounded-xl font-semibold text-white text-sm bg-green-700 hover:bg-green-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Adding member...</>
            ) : (
              <><UserPlus className="w-4 h-4" /> Add Member</>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
