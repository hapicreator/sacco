// FILE: src/app/(dashboard)/dashboard/payments/page.tsx
// ACTION: REPLACE
// FIX: getUser() instead of getSession(), defensive null handling

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { CreditCard } from "lucide-react"
import PaymentMethodsList from "@/components/dashboard/PaymentMethodsList"

export const metadata = { title: "Payment Methods" }

export default async function PaymentsPage() {
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

  const { sacco_id, role } = saccoUser
  const isAdmin = role === "sacco_admin" || role === "staff"

  const { data: methods, error } = await supabase
    .from("payment_methods")
    .select("*")
    .eq("sacco_id", sacco_id)
    .order("display_order", { ascending: true })

  if (error) console.error("Payment methods fetch error:", error.message)

  const allMethods = methods ?? []

  return (
    <div className="space-y-6 pb-20 lg:pb-0">

      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-stone-900"
              style={{ fontFamily: "var(--font-heading, serif)" }}>
            Payment Methods
          </h2>
          <p className="text-sm text-stone-500 mt-0.5">
            {isAdmin
              ? "Configure how members can make deposits and payments."
              : "How to pay your savings and loan repayments."
            }
          </p>
        </div>
      </div>

      {!isAdmin && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
          <p className="text-sm text-blue-800 font-semibold mb-1">How to make a payment</p>
          <p className="text-sm text-blue-700">
            Use any of the payment channels below to deposit money. After paying,
            upload your receipt on the{" "}
            <a href="/dashboard/documents" className="font-semibold underline">Documents page</a>{" "}
            so your admin can verify and record it.
          </p>
        </div>
      )}

      <PaymentMethodsList methods={allMethods} saccoId={sacco_id} isAdmin={isAdmin} />

      {allMethods.length === 0 && !isAdmin && (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm py-16 text-center">
          <CreditCard className="w-8 h-8 text-stone-300 mx-auto mb-3" />
          <p className="text-stone-500 text-sm font-medium">No payment methods set up yet</p>
          <p className="text-stone-400 text-xs mt-1">
            Your SACCO admin has not configured payment channels yet. Please contact them directly.
          </p>
        </div>
      )}
    </div>
  )
}
