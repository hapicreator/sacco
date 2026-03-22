// FILE: src/app/(dashboard)/dashboard/loans/page.tsx
// ACTION: REPLACE
// FIX: getUser() instead of getSession(), defensive null handling

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { CreditCard, Plus, Clock, CheckCircle, XCircle, AlertTriangle, TrendingUp } from "lucide-react"
import { formatUGX, formatDate } from "@/lib/utils"

export const metadata = { title: "Loans" }

const LOAN_STATUS_STYLES: Record<string, string> = {
  pending:   "bg-amber-50 text-amber-700 border border-amber-200",
  approved:  "bg-blue-50 text-blue-700 border border-blue-200",
  disbursed: "bg-purple-50 text-purple-700 border border-purple-200",
  active:    "bg-green-50 text-green-700 border border-green-200",
  completed: "bg-stone-100 text-stone-500 border border-stone-200",
  defaulted: "bg-red-50 text-red-600 border border-red-200",
  rejected:  "bg-red-50 text-red-400 border border-red-100",
}

const LOAN_STATUS_ICONS: Record<string, React.ElementType> = {
  pending:   Clock,
  approved:  CheckCircle,
  disbursed: TrendingUp,
  active:    TrendingUp,
  completed: CheckCircle,
  defaulted: AlertTriangle,
  rejected:  XCircle,
}

export default async function LoansPage({
  searchParams,
}: {
  searchParams: { status?: string }
}) {
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
  const isAdmin    = role === "sacco_admin" || role === "staff"
  const statusFilter = searchParams.status ?? "all"

  // ── Admin view ─────────────────────────────────────────────────────────────
  if (isAdmin) {
    let query = supabase
      .from("loans")
      .select(`
        id,
        amount_applied,
        amount_approved,
        interest_rate,
        duration_months,
        outstanding_balance,
        amount_repaid,
        total_repayable,
        status,
        purpose,
        applied_at,
        approved_at,
        disbursed_at,
        due_date,
        member:members(
          id,
          membership_number,
          profile:profiles(full_name)
        )
      `)
      .eq("sacco_id", sacco_id)
      .order("applied_at", { ascending: false })

    if (statusFilter !== "all") query = query.eq("status", statusFilter)

    const { data: loans, error } = await query
    if (error) console.error("Loans fetch error:", error.message)

    const all            = loans ?? []
    const pending        = all.filter((l) => l.status === "pending").length
    const active         = all.filter((l) => ["active", "disbursed"].includes(l.status)).length
    const completed      = all.filter((l) => l.status === "completed").length
    const defaulted      = all.filter((l) => l.status === "defaulted").length
    const totalOutstanding = all
      .filter((l) => ["active", "disbursed"].includes(l.status))
      .reduce((s, l) => s + (l.outstanding_balance ?? 0), 0)

    return (
      <div className="space-y-6 pb-20 lg:pb-0">

        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-stone-900"
                style={{ fontFamily: "var(--font-heading, serif)" }}>Loans</h2>
            <p className="text-sm text-stone-500 mt-0.5">{all.length} total loan{all.length !== 1 ? "s" : ""}</p>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Pending Review", value: pending,   color: "bg-amber-50",  text: "text-amber-700"  },
            { label: "Active Loans",   value: active,    color: "bg-green-50",  text: "text-green-700"  },
            { label: "Completed",      value: completed, color: "bg-stone-50",  text: "text-stone-600"  },
            { label: "Defaulted",      value: defaulted, color: "bg-red-50",    text: "text-red-600"    },
          ].map((card) => (
            <div key={card.label} className={`${card.color} rounded-2xl p-4 border border-stone-100`}>
              <p className={`text-2xl font-bold ${card.text}`}
                 style={{ fontFamily: "var(--font-heading, serif)" }}>
                {card.value}
              </p>
              <p className="text-xs text-stone-500 mt-1">{card.label}</p>
            </div>
          ))}
        </div>

        {totalOutstanding > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-700 font-medium">Total Outstanding Loan Balance</p>
              <p className="text-xs text-orange-500">Across all active and disbursed loans</p>
            </div>
            <p className="text-2xl font-bold text-orange-700"
               style={{ fontFamily: "var(--font-heading, serif)" }}>
              {formatUGX(totalOutstanding)}
            </p>
          </div>
        )}

        {pending > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">
                {pending} loan application{pending > 1 ? "s" : ""} waiting for review
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                <Link href="/dashboard/loans?status=pending" className="font-semibold underline">
                  Review pending loans →
                </Link>
              </p>
            </div>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {[
            { value: "all",       label: "All"       },
            { value: "pending",   label: "Pending"   },
            { value: "approved",  label: "Approved"  },
            { value: "active",    label: "Active"    },
            { value: "completed", label: "Completed" },
            { value: "defaulted", label: "Defaulted" },
            { value: "rejected",  label: "Rejected"  },
          ].map((f) => (
            <Link key={f.value} href={`/dashboard/loans?status=${f.value}`}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                statusFilter === f.value
                  ? "bg-green-700 text-white"
                  : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50"
              }`}>
              {f.label}
            </Link>
          ))}
        </div>

        {/* Loans list */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          {all.length === 0 ? (
            <div className="py-16 text-center">
              <CreditCard className="w-8 h-8 text-stone-300 mx-auto mb-3" />
              <p className="text-stone-400 text-sm">No loans found</p>
            </div>
          ) : (
            <div className="divide-y divide-stone-50">
              {all.map((loan) => {
                const member   = loan.member as any
                const profile  = member?.profile as any
                const StatusIcon = LOAN_STATUS_ICONS[loan.status] ?? Clock
                const total    = (loan.amount_approved ?? loan.amount_applied) * (1 + loan.interest_rate / 100)
                const progress = total > 0 ? Math.min((loan.amount_repaid / total) * 100, 100) : 0

                return (
                  <Link key={loan.id} href={`/dashboard/loans/${loan.id}`}
                    className="block px-5 py-4 hover:bg-stone-50 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <StatusIcon className="w-5 h-5 text-stone-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-1">
                          <div>
                            <p className="text-sm font-semibold text-stone-900">
                              {profile?.full_name ?? "Unknown Member"}
                            </p>
                            <p className="text-xs text-stone-400">{member?.membership_number}</p>
                          </div>
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full self-start capitalize ${LOAN_STATUS_STYLES[loan.status] ?? ""}`}>
                            {loan.status}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500 mt-1">
                          <span>Applied: {formatUGX(loan.amount_applied)}</span>
                          {loan.amount_approved && <span>Approved: {formatUGX(loan.amount_approved)}</span>}
                          {(loan.outstanding_balance ?? 0) > 0 && (
                            <span className="text-orange-600 font-medium">
                              Outstanding: {formatUGX(loan.outstanding_balance ?? 0)}
                            </span>
                          )}
                          <span>{loan.duration_months} months @ {loan.interest_rate}%</span>
                          <span>Applied {formatDate(loan.applied_at)}</span>
                        </div>
                        {["active", "disbursed", "completed"].includes(loan.status) && progress > 0 && (
                          <div className="mt-2">
                            <div className="flex justify-between text-xs text-stone-400 mb-1">
                              <span>Repaid: {formatUGX(loan.amount_repaid)}</span>
                              <span>{Math.round(progress)}%</span>
                            </div>
                            <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                              <div className="h-full bg-green-500 rounded-full transition-all"
                                   style={{ width: `${progress}%` }} />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Member view ────────────────────────────────────────────────────────────
  const { data: member } = await supabase
    .from("members")
    .select("id, membership_number")
    .eq("user_id", user.id)
    .eq("sacco_id", sacco_id)
    .single()

  const { data: loans } = await supabase
    .from("loans")
    .select(`
      id, amount_applied, amount_approved, interest_rate,
      duration_months, outstanding_balance, amount_repaid,
      total_repayable, monthly_repayment, status, purpose,
      applied_at, due_date
    `)
    .eq("member_id", member?.id ?? "")
    .eq("sacco_id", sacco_id)
    .order("applied_at", { ascending: false })

  const activeLoans      = loans?.filter((l) => ["active", "disbursed"].includes(l.status)) ?? []
  const totalOutstanding = activeLoans.reduce((s, l) => s + (l.outstanding_balance ?? 0), 0)

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-stone-900"
              style={{ fontFamily: "var(--font-heading, serif)" }}>My Loans</h2>
          <p className="text-sm text-stone-500 mt-0.5">Your loan history and applications</p>
        </div>
        <Link href="/dashboard/loans/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-700 hover:bg-green-800 text-white text-sm font-semibold rounded-xl transition-colors">
          <Plus className="w-4 h-4" />
          Apply for Loan
        </Link>
      </div>

      {totalOutstanding > 0 && (
        <div className="bg-gradient-to-r from-orange-600 to-orange-500 rounded-2xl p-6 text-white">
          <p className="text-orange-200 text-sm mb-1">Outstanding Loan Balance</p>
          <p className="text-4xl font-bold" style={{ fontFamily: "var(--font-heading, serif)" }}>
            {formatUGX(totalOutstanding)}
          </p>
          <p className="text-orange-200 text-xs mt-1">
            Across {activeLoans.length} active loan{activeLoans.length !== 1 ? "s" : ""}
          </p>
        </div>
      )}

      {!loans || loans.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm py-16 text-center">
          <CreditCard className="w-8 h-8 text-stone-300 mx-auto mb-3" />
          <p className="text-stone-500 font-medium text-sm mb-1">No loans yet</p>
          <p className="text-stone-400 text-xs mb-5">Apply for your first loan to get started.</p>
          <Link href="/dashboard/loans/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-700 hover:bg-green-800 text-white text-sm font-semibold rounded-xl transition-colors">
            <Plus className="w-4 h-4" />
            Apply for Loan
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {loans.map((loan) => {
            const StatusIcon = LOAN_STATUS_ICONS[loan.status] ?? Clock
            const progress   = loan.total_repayable && loan.amount_repaid
              ? Math.min((loan.amount_repaid / loan.total_repayable) * 100, 100)
              : 0

            return (
              <Link key={loan.id} href={`/dashboard/loans/${loan.id}`}
                className="block bg-white rounded-2xl border border-stone-100 shadow-sm p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-stone-900 text-base">
                      {formatUGX(loan.amount_approved ?? loan.amount_applied)}
                    </p>
                    <p className="text-xs text-stone-400 mt-0.5">
                      {loan.duration_months} months · {loan.interest_rate}% p.a.
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${LOAN_STATUS_STYLES[loan.status] ?? ""}`}>
                    {loan.status}
                  </span>
                </div>
                {loan.purpose && (
                  <p className="text-sm text-stone-500 mb-3">{loan.purpose}</p>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-400 mb-3">
                  <span>Applied {formatDate(loan.applied_at)}</span>
                  {loan.due_date && <span>Due {formatDate(loan.due_date)}</span>}
                  {loan.monthly_repayment && <span>Monthly: {formatUGX(loan.monthly_repayment)}</span>}
                </div>
                {["active", "disbursed", "completed"].includes(loan.status) && (
                  <div>
                    <div className="flex justify-between text-xs text-stone-400 mb-1">
                      <span>Repaid: {formatUGX(loan.amount_repaid)}</span>
                      <span>Remaining: {formatUGX(loan.outstanding_balance ?? 0)}</span>
                    </div>
                    <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full"
                           style={{ width: `${progress}%` }} />
                    </div>
                    <p className="text-xs text-stone-400 mt-1 text-right">{Math.round(progress)}% repaid</p>
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
