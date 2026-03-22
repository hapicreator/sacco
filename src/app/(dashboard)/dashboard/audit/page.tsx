// FILE: src/app/(dashboard)/dashboard/audit/page.tsx
// ACTION: REPLACE
// FIX: Was a placeholder causing 404 — now shows real activity feed

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import {
  ShieldCheck, ArrowDownRight, ArrowUpRight,
  CreditCard, Users, FileText, Settings
} from "lucide-react"
import { formatUGX, formatDateTime } from "@/lib/utils"

export const metadata = { title: "Audit Logs" }

export default async function AuditPage() {
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
  if (saccoUser.role === "member") redirect("/dashboard")

  const { sacco_id } = saccoUser

  // Fetch recent transactions as audit trail
  const { data: transactions } = await supabase
    .from("transactions")
    .select(`
      id, transaction_type, amount, status, reference_no,
      created_at, payment_method, description,
      account:accounts(
        member:members(
          membership_number,
          profile:profiles!user_id(full_name)
        )
      )
    `)
    .eq("sacco_id", sacco_id)
    .order("created_at", { ascending: false })
    .limit(30)

  // Fetch recent loan status changes
  const { data: loans } = await supabase
    .from("loans")
    .select(`
      id, status, amount_applied, amount_approved, applied_at, approved_at, disbursed_at,
      member:members(
        membership_number,
        profile:profiles!user_id(full_name)
      )
    `)
    .eq("sacco_id", sacco_id)
    .order("applied_at", { ascending: false })
    .limit(20)

  // Fetch recent member joins
  const { data: members } = await supabase
    .from("members")
    .select(`
      id, membership_number, status, created_at,
      profile:profiles!user_id(full_name)
    `)
    .eq("sacco_id", sacco_id)
    .order("created_at", { ascending: false })
    .limit(10)

  // Helper
  function getProfile(p: any) {
    if (!p) return null
    if (Array.isArray(p)) return p[0] ?? null
    return p
  }
  function getMember(m: any) {
    if (!m) return null
    if (Array.isArray(m)) return m[0] ?? null
    return m
  }
  function getAccount(a: any) {
    if (!a) return null
    if (Array.isArray(a)) return a[0] ?? null
    return a
  }

  // Build unified event log
  type Event = {
    id:        string
    time:      string
    type:      "transaction" | "loan" | "member"
    icon:      any
    iconColor: string
    title:     string
    subtitle:  string
    amount?:   number
    isCredit?: boolean
    status?:   string
  }

  const events: Event[] = []

  for (const txn of transactions ?? []) {
    const account = getAccount(txn.account)
    const member  = getMember(account?.member)
    const profile = getProfile(member?.profile)
    const name    = profile?.full_name ?? member?.membership_number ?? "Unknown"
    const isCredit = ["deposit", "loan_disbursement"].includes(txn.transaction_type)

    events.push({
      id:        txn.id,
      time:      txn.created_at,
      type:      "transaction",
      icon:      isCredit ? ArrowDownRight : ArrowUpRight,
      iconColor: isCredit ? "bg-blue-50 text-blue-600" : "bg-red-50 text-red-500",
      title:     `${txn.transaction_type.replace(/_/g, " ")} — ${name}`,
      subtitle:  `${txn.reference_no ?? ""}${txn.payment_method ? " · " + txn.payment_method.replace("_", " ") : ""}`,
      amount:    txn.amount,
      isCredit,
      status:    txn.status,
    })
  }

  for (const loan of loans ?? []) {
    const member  = getMember(loan.member)
    const profile = getProfile(member?.profile)
    const name    = profile?.full_name ?? member?.membership_number ?? "Unknown"

    if (loan.disbursed_at) {
      events.push({
        id:        loan.id + "-disb",
        time:      loan.disbursed_at,
        type:      "loan",
        icon:      CreditCard,
        iconColor: "bg-purple-50 text-purple-600",
        title:     `Loan disbursed — ${name}`,
        subtitle:  `${member?.membership_number ?? ""}`,
        amount:    loan.amount_approved ?? loan.amount_applied,
        isCredit:  true,
        status:    "disbursed",
      })
    }
    if (loan.approved_at && loan.status !== "disbursed") {
      events.push({
        id:        loan.id + "-appr",
        time:      loan.approved_at,
        type:      "loan",
        icon:      CreditCard,
        iconColor: loan.status === "rejected" ? "bg-red-50 text-red-500" : "bg-green-50 text-green-600",
        title:     `Loan ${loan.status} — ${name}`,
        subtitle:  `Applied: ${formatUGX(loan.amount_applied)}`,
        status:    loan.status,
      })
    }
    events.push({
      id:        loan.id + "-appl",
      time:      loan.applied_at,
      type:      "loan",
      icon:      CreditCard,
      iconColor: "bg-amber-50 text-amber-600",
      title:     `Loan application — ${name}`,
      subtitle:  `${formatUGX(loan.amount_applied)} requested`,
      amount:    loan.amount_applied,
      status:    "pending",
    })
  }

  for (const m of members ?? []) {
    const profile = getProfile(m.profile)
    const name    = profile?.full_name ?? m.membership_number
    events.push({
      id:        m.id,
      time:      m.created_at,
      type:      "member",
      icon:      Users,
      iconColor: "bg-blue-50 text-blue-600",
      title:     `New member joined — ${name}`,
      subtitle:  m.membership_number,
      status:    m.status,
    })
  }

  // Sort all events by time descending
  events.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
  const sorted = events.slice(0, 50)

  return (
    <div className="space-y-6 pb-20 lg:pb-0 max-w-3xl">

      <div>
        <h2 className="text-2xl font-bold text-stone-900"
            style={{ fontFamily: "var(--font-heading, serif)" }}>
          Audit Logs
        </h2>
        <p className="text-sm text-stone-500 mt-0.5">
          Recent activity across transactions, loans, and member changes
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
        {sorted.length === 0 ? (
          <div className="py-16 text-center">
            <ShieldCheck className="w-8 h-8 text-stone-300 mx-auto mb-3" />
            <p className="text-stone-400 text-sm">No activity yet</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-50">
            {sorted.map((event) => {
              const Icon = event.icon
              return (
                <div key={event.id} className="px-5 py-4 flex items-start gap-4 hover:bg-stone-50 transition-colors">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${event.iconColor}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-stone-900 capitalize">{event.title}</p>
                    {event.subtitle && (
                      <p className="text-xs text-stone-400 mt-0.5">{event.subtitle}</p>
                    )}
                    <p className="text-xs text-stone-400 mt-0.5">{formatDateTime(event.time)}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {event.amount && (
                      <p className={`text-sm font-bold ${event.isCredit ? "text-blue-700" : "text-red-600"}`}>
                        {event.isCredit ? "+" : "-"}{formatUGX(event.amount)}
                      </p>
                    )}
                    {event.status && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${
                        event.status === "completed" || event.status === "active" ? "bg-green-50 text-green-700"
                        : event.status === "pending"  ? "bg-amber-50 text-amber-700"
                        : event.status === "rejected" ? "bg-red-50 text-red-500"
                        : "bg-stone-100 text-stone-500"
                      }`}>
                        {event.status}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
