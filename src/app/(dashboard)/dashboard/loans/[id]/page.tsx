// FILE: src/app/(dashboard)/dashboard/loans/[id]/page.tsx
// ACTION: REPLACE
// FIX: getUser() instead of getSession(), defensive null handling

import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, TrendingUp } from "lucide-react"
import { formatUGX, formatDate, formatDateTime, getInitials } from "@/lib/utils"
import LoanActionButtons from "@/components/dashboard/LoanActionButtons"

export default async function LoanDetailPage({
  params,
}: {
  params: { id: string }
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
  const isAdmin = role === "sacco_admin" || role === "staff"

  const { data: loan } = await supabase
    .from("loans")
    .select(`
      id,
      amount_applied,
      amount_approved,
      interest_rate,
      duration_months,
      monthly_repayment,
      total_repayable,
      amount_repaid,
      outstanding_balance,
      purpose,
      notes,
      status,
      applied_at,
      approved_at,
      disbursed_at,
      due_date,
      member:members(
        id,
        membership_number,
        user_id,
        profile:profiles(full_name, phone)
      )
    `)
    .eq("id", params.id)
    .eq("sacco_id", sacco_id)
    .single()

  if (!loan) notFound()

  const member  = loan.member as any
  const profile = member?.profile as any

  const { data: repayments } = await supabase
    .from("loan_repayments")
    .select("id, amount_paid, principal_paid, interest_paid, balance_after, payment_date, notes")
    .eq("loan_id", loan.id)
    .order("payment_date", { ascending: false })

  const progress = loan.total_repayable && loan.amount_repaid
    ? Math.min((loan.amount_repaid / loan.total_repayable) * 100, 100)
    : 0

  const STATUS_COLORS: Record<string, string> = {
    pending:   "bg-amber-50 text-amber-700 border border-amber-200",
    approved:  "bg-blue-50 text-blue-700 border border-blue-200",
    disbursed: "bg-purple-50 text-purple-700 border border-purple-200",
    active:    "bg-green-50 text-green-700 border border-green-200",
    completed: "bg-stone-100 text-stone-500 border border-stone-200",
    defaulted: "bg-red-50 text-red-600 border border-red-200",
    rejected:  "bg-red-50 text-red-400 border border-red-100",
  }

  const timeline = [
    { label: "Applied",   date: loan.applied_at,   done: true,                                               rejected: false },
    { label: loan.status === "rejected" ? "Rejected" : "Approved", date: loan.approved_at,
      done: ["approved", "disbursed", "active", "completed", "rejected"].includes(loan.status),
      rejected: loan.status === "rejected" },
    { label: "Disbursed", date: loan.disbursed_at, done: ["disbursed", "active", "completed"].includes(loan.status), rejected: false },
    { label: "Completed", date: loan.status === "completed" ? loan.due_date : undefined,
      done: loan.status === "completed",
      rejected: false },
  ]

  const memberName = profile?.full_name ?? "Unknown Member"

  return (
    <div className="max-w-3xl space-y-6 pb-20 lg:pb-6">

      <Link href="/dashboard/loans"
        className="inline-flex items-center gap-1.5 text-stone-400 hover:text-stone-600 text-sm transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Loans
      </Link>

      {/* Header card */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-5">
          <div className="w-12 h-12 bg-green-700 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold">{getInitials(memberName)}</span>
          </div>
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <h2 className="text-xl font-bold text-stone-900"
                  style={{ fontFamily: "var(--font-heading, serif)" }}>
                {memberName}
              </h2>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full self-start capitalize ${STATUS_COLORS[loan.status] ?? ""}`}>
                {loan.status}
              </span>
            </div>
            <p className="text-sm text-stone-400">{member?.membership_number}</p>
          </div>

          {isAdmin && member?.id && member?.user_id && (
            <LoanActionButtons
              loanId={loan.id}
              status={loan.status}
              memberId={member.id}
              saccoId={sacco_id}
              amountApplied={loan.amount_applied}
              interestRate={loan.interest_rate}
              durationMonths={loan.duration_months}
              monthlyRepayment={loan.monthly_repayment ?? 0}
              totalRepayable={loan.total_repayable ?? 0}
              outstandingBalance={loan.outstanding_balance ?? 0}
              memberUserId={member.user_id}
            />
          )}
        </div>

        {/* Amounts grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5 border-t border-stone-100">
          {[
            { label: "Amount Applied",  value: formatUGX(loan.amount_applied) },
            { label: "Amount Approved", value: loan.amount_approved ? formatUGX(loan.amount_approved) : "Pending" },
            { label: "Total Repayable", value: loan.total_repayable ? formatUGX(loan.total_repayable) : "—" },
            { label: "Monthly Payment", value: loan.monthly_repayment ? formatUGX(loan.monthly_repayment) : "—" },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-xs text-stone-400 mb-1">{item.label}</p>
              <p className="text-sm font-bold text-stone-900">{item.value}</p>
            </div>
          ))}
        </div>

        {/* Loan terms */}
        <div className="grid grid-cols-3 gap-4 pt-4 mt-4 border-t border-stone-100">
          <div>
            <p className="text-xs text-stone-400 mb-1">Interest Rate</p>
            <p className="text-sm font-semibold text-stone-700">{loan.interest_rate}% p.a.</p>
          </div>
          <div>
            <p className="text-xs text-stone-400 mb-1">Duration</p>
            <p className="text-sm font-semibold text-stone-700">{loan.duration_months} months</p>
          </div>
          {loan.due_date && (
            <div>
              <p className="text-xs text-stone-400 mb-1">Due Date</p>
              <p className="text-sm font-semibold text-stone-700">{formatDate(loan.due_date)}</p>
            </div>
          )}
        </div>

        {loan.purpose && (
          <div className="pt-4 mt-4 border-t border-stone-100">
            <p className="text-xs text-stone-400 mb-1">Purpose</p>
            <p className="text-sm text-stone-700">{loan.purpose}</p>
          </div>
        )}

        {loan.notes && (
          <div className="pt-3">
            <p className="text-xs text-stone-400 mb-1">Notes</p>
            <p className="text-sm text-stone-500 italic">{loan.notes}</p>
          </div>
        )}
      </div>

      {/* Repayment progress */}
      {["active", "disbursed", "completed"].includes(loan.status) && (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
          <h3 className="font-semibold text-stone-900 mb-4"
              style={{ fontFamily: "var(--font-heading, serif)" }}>Repayment Progress</h3>
          <div className="flex justify-between text-sm text-stone-600 mb-2">
            <span>Repaid: <strong>{formatUGX(loan.amount_repaid)}</strong></span>
            <span>Remaining: <strong className="text-orange-600">{formatUGX(loan.outstanding_balance ?? 0)}</strong></span>
          </div>
          <div className="h-3 bg-stone-100 rounded-full overflow-hidden mb-2">
            <div className="h-full bg-green-500 rounded-full transition-all"
                 style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-stone-400 text-right">{Math.round(progress)}% repaid</p>
        </div>
      )}

      {/* Timeline */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
        <h3 className="font-semibold text-stone-900 mb-5"
            style={{ fontFamily: "var(--font-heading, serif)" }}>Loan Timeline</h3>
        <div className="space-y-4">
          {timeline.map((step, i) => (
            <div key={i} className="flex items-start gap-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2 ${
                step.done
                  ? step.rejected ? "bg-red-500 border-red-500" : "bg-green-600 border-green-600"
                  : "bg-white border-stone-200"
              }`}>
                {step.done && (
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div className="flex-1 pt-0.5">
                <p className={`text-sm font-semibold ${step.done ? (step.rejected ? "text-red-600" : "text-stone-900") : "text-stone-400"}`}>
                  {step.label}
                </p>
                {step.date && (
                  <p className="text-xs text-stone-400">{formatDateTime(step.date)}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Repayment history */}
      {repayments && repayments.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-100">
            <h3 className="font-semibold text-stone-900"
                style={{ fontFamily: "var(--font-heading, serif)" }}>Repayment History</h3>
          </div>
          <div className="divide-y divide-stone-50">
            {repayments.map((r) => (
              <div key={r.id} className="px-5 py-3.5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-stone-800">
                    Payment of {formatUGX(r.amount_paid)}
                  </p>
                  <p className="text-xs text-stone-400">
                    Principal: {formatUGX(r.principal_paid)} · Interest: {formatUGX(r.interest_paid)}
                  </p>
                  <p className="text-xs text-stone-400">{formatDate(r.payment_date)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-stone-400">Balance after</p>
                  <p className="text-sm font-bold text-orange-600">{formatUGX(r.balance_after)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
