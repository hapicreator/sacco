// FILE: src/app/(dashboard)/dashboard/settings/page.tsx
// ACTION: REPLACE
// FIX: getUser() instead of getSession(), defensive null handling

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Settings, Shield } from "lucide-react"
import SaccoProfileForm from "@/components/dashboard/SaccoProfileForm"
import FinancialRulesForm from "@/components/dashboard/FinancialRulesForm"
import InviteCodeCard from "@/components/dashboard/InviteCodeCard"

export const metadata = { title: "Settings" }

export default async function SettingsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: saccoUser } = await supabase
    .from("sacco_users")
    .select("sacco_id, role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single()

  if (!saccoUser) redirect("/onboarding")

  // Only sacco_admin can access settings — hard redirect for any other role
  if (saccoUser.role !== "sacco_admin" && saccoUser.role !== "super_admin") {
    redirect("/dashboard")
  }

  const { sacco_id } = saccoUser

  const { data: sacco } = await supabase
    .from("saccos")
    .select("id, name, registration_no, email, phone, address, district, status, max_members, logo_url")
    .eq("id", sacco_id)
    .single()

  if (!sacco) redirect("/dashboard")

  const { data: settings } = await supabase
    .from("sacco_settings")
    .select("*")
    .eq("sacco_id", sacco_id)
    .single()

  return (
    <div className="max-w-3xl space-y-8 pb-20 lg:pb-6">

      <div>
        <h2 className="text-2xl font-bold text-stone-900"
            style={{ fontFamily: "var(--font-heading, serif)" }}>
          SACCO Settings
        </h2>
        <p className="text-sm text-stone-500 mt-0.5">
          Manage your SACCO profile, financial rules, and member access.
        </p>
      </div>

      {/* Invite Code */}
      <InviteCodeCard saccoId={sacco.id} saccoName={sacco.name} />

      {/* SACCO Profile */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-100 flex items-center gap-3">
          <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
            <Settings className="w-4 h-4 text-green-700" />
          </div>
          <div>
            <h3 className="font-semibold text-stone-900"
                style={{ fontFamily: "var(--font-heading, serif)" }}>SACCO Profile</h3>
            <p className="text-xs text-stone-400">Basic information about your SACCO</p>
          </div>
        </div>
        <div className="p-6">
          <SaccoProfileForm sacco={sacco} />
        </div>
      </div>

      {/* Financial Rules */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-100 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
            <Shield className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-stone-900"
                style={{ fontFamily: "var(--font-heading, serif)" }}>Financial Rules</h3>
            <p className="text-xs text-stone-400">Loan limits, interest rates, and savings requirements</p>
          </div>
        </div>
        <div className="p-6">
          <FinancialRulesForm saccoId={sacco_id} settings={settings} />
        </div>
      </div>

      {/* SACCO Status */}
      <div className="bg-stone-50 rounded-2xl border border-stone-200 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-stone-700">SACCO Status</p>
            <p className="text-xs text-stone-400 mt-0.5">Member cap: {sacco.max_members} members</p>
          </div>
          <span className={`text-xs font-semibold px-3 py-1.5 rounded-full capitalize ${
            sacco.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
          }`}>
            {sacco.status}
          </span>
        </div>
      </div>
    </div>
  )
}
