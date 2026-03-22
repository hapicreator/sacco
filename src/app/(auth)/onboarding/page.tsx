// FILE: src/app/(auth)/onboarding/page.tsx
// ACTION: REPLACE
// FIX: Typed props, typed event handlers, useState<string | null>(null)

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Building2, Users, ArrowRight, ArrowLeft, AlertCircle, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

type View = "choose" | "create" | "join"

const UGANDA_DISTRICTS = [
  "Abim","Adjumani","Agago","Alebtong","Amolatar","Amuria","Amuru","Apac","Arua",
  "Budaka","Bududa","Bugiri","Buikwe","Bukedea","Bukomansimbi","Bukwa","Bulambuli",
  "Buliisa","Bundibugyo","Bunyangabu","Bushenyi","Busia","Butaleja","Butebo",
  "Buvuma","Buyende","Dokolo","Gomba","Gulu","Hoima","Ibanda","Iganga","Isingiro",
  "Jinja","Kaabong","Kabale","Kabarole","Kaberamaido","Kagadi","Kakumiro","Kalaki",
  "Kalangala","Kaliro","Kalungu","Kampala","Kamuli","Kamwenge","Kanungu","Kapchorwa",
  "Kapelebyong","Kasanda","Kasese","Katakwi","Kayunga","Kazo","Kibale","Kiboga",
  "Kibuku","Kikuube","Kiruhura","Kiryandongo","Kisoro","Kitgum","Koboko","Kole",
  "Kotido","Kumi","Kwania","Kween","Kyankwanzi","Kyegegwa","Kyenjojo","Kyotera",
  "Lamwo","Lira","Luuka","Luwero","Lwengo","Lyantonde","Manafwa","Maracha","Masaka",
  "Masindi","Mayuge","Mbale","Mbarara","Mitooma","Mityana","Moroto","Moyo","Mpigi",
  "Mubende","Mukono","Nakapiripirit","Nakaseke","Nakasongola","Namayingo",
  "Namisindwa","Namutumba","Napak","Nebbi","Ngora","Ntoroko","Ntungamu","Nwoya",
  "Omoro","Otuke","Oyam","Pader","Pakwach","Pallisa","Rakai","Rubanda","Rubirizi",
  "Rukiga","Rukungiri","Rwampara","Sembabule","Serere","Sheema","Sironko","Soroti",
  "Tororo","Wakiso","Yumbe","Zombo",
]

export default function OnboardingPage() {
  const [view, setView] = useState<View>("choose")
  return (
    <div>
      {view === "choose" && <ChooseView onSelect={setView} />}
      {view === "create" && <CreateSaccoView onBack={() => setView("choose")} />}
      {view === "join"   && <JoinSaccoView   onBack={() => setView("choose")} />}
    </div>
  )
}

// ── ChooseView ────────────────────────────────────────────────────────────────
function ChooseView({ onSelect }: { onSelect: (v: View) => void }) {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-stone-900 mb-2"
            style={{ fontFamily: "var(--font-heading, serif)" }}>
          Welcome aboard!
        </h1>
        <p className="text-stone-500 text-sm leading-relaxed">
          Your account is ready. Now connect to a SACCO.
        </p>
      </div>
      <div className="space-y-4">
        <button onClick={() => onSelect("create")}
          className="w-full p-5 rounded-2xl border-2 border-stone-200 hover:border-green-600 bg-white hover:bg-green-50 text-left group transition-all duration-200">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-green-100 group-hover:bg-green-200 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors">
              <Building2 className="w-6 h-6 text-green-700" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-stone-900 text-lg">Create a new SACCO</h3>
                <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-green-600 transition-colors" />
              </div>
              <p className="text-stone-500 text-sm mt-1">Register your SACCO. You become the administrator.</p>
              <span className="inline-block mt-2 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                For SACCO Admins
              </span>
            </div>
          </div>
        </button>

        <button onClick={() => onSelect("join")}
          className="w-full p-5 rounded-2xl border-2 border-stone-200 hover:border-orange-400 bg-white hover:bg-orange-50 text-left group transition-all duration-200">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-orange-100 group-hover:bg-orange-200 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors">
              <Users className="w-6 h-6 text-orange-700" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-stone-900 text-lg">Join an existing SACCO</h3>
                <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-orange-600 transition-colors" />
              </div>
              <p className="text-stone-500 text-sm mt-1">Your admin shared a SACCO code. Enter it to join.</p>
              <span className="inline-block mt-2 text-xs font-medium text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">
                For Members &amp; Staff
              </span>
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}

// ── CreateSaccoView ───────────────────────────────────────────────────────────
function CreateSaccoView({ onBack }: { onBack: () => void }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const [name, setName]         = useState("")
  const [regNo, setRegNo]       = useState("")
  const [email, setEmail]       = useState("")
  const [phone, setPhone]       = useState("")
  const [district, setDistrict] = useState("")
  const [address, setAddress]   = useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError("You must be logged in."); setIsLoading(false); return }

    const { data: sacco, error: saccoError } = await supabase
      .from("saccos")
      .insert({
        name,
        registration_no: regNo || null,
        email,
        phone:   phone || null,
        address: address || null,
        district,
      })
      .select()
      .single()

    if (saccoError) { setError(saccoError.message); setIsLoading(false); return }

    await supabase.from("sacco_users").insert({
      sacco_id: sacco.id,
      user_id:  user.id,
      role:     "sacco_admin",
    })

    await supabase.from("sacco_settings").insert({ sacco_id: sacco.id })

    router.push("/dashboard")
    router.refresh()
  }

  return (
    <div>
      <button onClick={onBack}
        className="inline-flex items-center gap-1.5 text-stone-400 hover:text-stone-600 text-sm mb-5 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <h1 className="text-2xl font-bold text-stone-900 mb-1"
          style={{ fontFamily: "var(--font-heading, serif)" }}>
        Register your SACCO
      </h1>
      <p className="text-stone-500 text-sm mb-6">Fill in the basic details. You can update everything later.</p>

      {error && (
        <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">
            SACCO name <span className="text-red-500">*</span>
          </label>
          <input type="text" required placeholder="e.g. Kampala Teachers SACCO"
            value={name} onChange={(e) => setName(e.target.value)} className="input-field" />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">
            Registration number <span className="text-stone-400 font-normal">(optional)</span>
          </label>
          <input type="text" placeholder="e.g. MFPED/SACCO/2024/001"
            value={regNo} onChange={(e) => setRegNo(e.target.value)} className="input-field" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Email <span className="text-red-500">*</span>
            </label>
            <input type="email" required placeholder="info@yoursacco.ug"
              value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">Phone</label>
            <input type="tel" placeholder="+256 700 000 000"
              value={phone} onChange={(e) => setPhone(e.target.value)} className="input-field" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">
            District <span className="text-red-500">*</span>
          </label>
          <select required value={district} onChange={(e) => setDistrict(e.target.value)}
            className="input-field">
            <option value="" disabled>Select a district...</option>
            {UGANDA_DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">
            Physical address <span className="text-stone-400 font-normal">(optional)</span>
          </label>
          <input type="text" placeholder="e.g. Plot 14, Kampala Road"
            value={address} onChange={(e) => setAddress(e.target.value)} className="input-field" />
        </div>

        <button type="submit" disabled={isLoading}
          className="btn-primary flex items-center justify-center gap-2 mt-2">
          {isLoading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating SACCO...</>
            : <><Building2 className="w-4 h-4" /> Create SACCO &amp; go to dashboard</>
          }
        </button>
      </form>
    </div>
  )
}

// ── JoinSaccoView ─────────────────────────────────────────────────────────────
function JoinSaccoView({ onBack }: { onBack: () => void }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [saccoCode, setSaccoCode] = useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError("You must be logged in."); setIsLoading(false); return }

    const { data: sacco, error: saccoError } = await supabase
      .from("saccos")
      .select("id, name, status, max_members")
      .eq("id", saccoCode.trim())
      .eq("status", "active")
      .single()

    if (saccoError || !sacco) {
      setError("Invalid SACCO code. Please check and try again.")
      setIsLoading(false)
      return
    }

    const { count } = await supabase
      .from("members")
      .select("id", { count: "exact", head: true })
      .eq("sacco_id", sacco.id)
      .eq("status", "active")

    if (count !== null && count >= sacco.max_members) {
      setError(`This SACCO has reached its maximum of ${sacco.max_members} members.`)
      setIsLoading(false)
      return
    }

    const { data: existing } = await supabase
      .from("sacco_users")
      .select("id")
      .eq("sacco_id", sacco.id)
      .eq("user_id", user.id)
      .maybeSingle()

    if (existing) { setError("You are already a member of this SACCO."); setIsLoading(false); return }

    await supabase.from("sacco_users").insert({
      sacco_id: sacco.id,
      user_id:  user.id,
      role:     "member",
    })

    const { count: memberCount } = await supabase
      .from("members")
      .select("id", { count: "exact", head: true })
      .eq("sacco_id", sacco.id)

    const sequence = (memberCount ?? 0) + 1
    const year     = new Date().getFullYear()
    const prefix   = sacco.name.slice(0, 3).toUpperCase()
    const memberNo = `${prefix}-${year}-${String(sequence).padStart(3, "0")}`

    await supabase.from("members").insert({
      sacco_id:          sacco.id,
      user_id:           user.id,
      membership_number: memberNo,
      status:            "active",
    })

    router.push("/dashboard")
    router.refresh()
  }

  return (
    <div>
      <button onClick={onBack}
        className="inline-flex items-center gap-1.5 text-stone-400 hover:text-stone-600 text-sm mb-5 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <h1 className="text-2xl font-bold text-stone-900 mb-1"
          style={{ fontFamily: "var(--font-heading, serif)" }}>
        Join a SACCO
      </h1>
      <p className="text-stone-500 text-sm mb-5">Ask your admin for the SACCO code and paste it below.</p>

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl mb-5">
        <p className="text-blue-700 text-sm leading-relaxed">
          <span className="font-semibold">Where is the code?</span><br />
          Your admin finds it in their dashboard under Settings → Share Code.
        </p>
      </div>

      {error && (
        <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">SACCO code</label>
          <input type="text" required placeholder="Paste the SACCO code here"
            value={saccoCode} onChange={(e) => setSaccoCode(e.target.value)}
            className="input-field font-mono text-sm tracking-wide" />
        </div>
        <button type="submit" disabled={isLoading || !saccoCode.trim()}
          className="btn-primary flex items-center justify-center gap-2">
          {isLoading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Joining SACCO...</>
            : <><Users className="w-4 h-4" /> Join SACCO</>
          }
        </button>
      </form>
    </div>
  )
}
