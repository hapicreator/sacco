// FILE: src/app/(dashboard)/dashboard/reports/page.tsx
// ACTION: REPLACE
//
// Reports page. Admin/Staff only.
// Shows:
//   1. Financial Summary — total savings, loans disbursed, repayments collected
//   2. Savings Report — per-member savings breakdown
//   3. Loan Portfolio — all active loans with status
//   4. Member Activity — who has/hasn't transacted recently
//   5. CSV Export buttons for each report

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { BarChart3, TrendingUp, Users, PiggyBank, CreditCard, Download } from "lucide-react"
import { formatUGX, formatDate } from "@/lib/utils"
import ReportExportButtons from "@/components/dashboard/ReportExportButtons"

export const metadata = { title: "Reports" }

export default async function ReportsPage() {
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
  if (role === "member") redirect("/dashboard")

  // ── Fetch all report data ──────────────────────────────────────────────────

  // 1. Total members
  const { count: totalMembers } = await supabase
    .from("members")
    .select("id", { count: "exact", head: true })
    .eq("sacco_id", sacco_id)
    .eq("status", "active")

  // 2. All savings accounts with balances
  const { data: savingsAccounts } = await supabase
    .from("accounts")
    .select(`
      id, account_number, balance, opened_at,
      member:members(
        membership_number,
        profile:profiles(full_name, phone)
      )
    `)
    .eq("sacco_id", sacco_id)
    .eq("account_type", "savings")
    .eq("is_active", true)
    .order("balance", { ascending: false })

  const totalSavings = savingsAccounts?.reduce((s, a) => s + (a.balance ?? 0), 0) ?? 0

  // 3. All loans
  const { data: loans } = await supabase
    .from("loans")
    .select(`
      id, amount_applied, amount_approved, outstanding_balance,
      amount_repaid, total_repayable, status, interest_rate,
      duration_months, applied_at, disbursed_at, due_date,
      member:members(
        membership_number,
        profile:profiles(full_name)
      )
    `)
    .eq("sacco_id", sacco_id)
    .order("applied_at", { ascending: false })

  const activeLoans    = loans?.filter((l) => ["active", "disbursed"].includes(l.status)) ?? []
  const completedLoans = loans?.filter((l) => l.status === "completed") ?? []
  const pendingLoans   = loans?.filter((l) => l.status === "pending") ?? []
  const totalDisbursed = loans
    ?.filter((l) => !["pending", "rejected"].includes(l.status))
    .reduce((s, l) => s + (l.amount_approved ?? l.amount_applied), 0) ?? 0
  const totalOutstanding = activeLoans.reduce((s, l) => s + (l.outstanding_balance ?? 0), 0)
  const totalRepaid    = loans?.reduce((s, l) => s + (l.amount_repaid ?? 0), 0) ?? 0

  // 4. Transaction summary (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: recentTxns } = await supabase
    .from("transactions")
    .select("transaction_type, amount, created_at")
    .eq("sacco_id", sacco_id)
    .eq("status", "completed")
    .gte("created_at", thirtyDaysAgo.toISOString())

  const depositsThisMonth = recentTxns
    ?.filter((t) => t.transaction_type === "deposit")
    .reduce((s, t) => s + t.amount, 0) ?? 0

  const withdrawalsThisMonth = recentTxns
    ?.filter((t) => t.transaction_type === "withdrawal")
    .reduce((s, t) => s + t.amount, 0) ?? 0

  const repaymentsThisMonth = recentTxns
    ?.filter((t) => t.transaction_type === "loan_repayment")
    .reduce((s, t) => s + t.amount, 0) ?? 0

  // 5. Members with zero savings
  const zeroBalanceMembers = savingsAccounts?.filter((a) => a.balance === 0) ?? []

  // ── Prepare CSV data for export ────────────────────────────────────────────
  const savingsCSV = (savingsAccounts ?? []).map((a) => {
    const m = a.member as any
    const p = m?.profile as any
    return {
      membership_number: m?.membership_number ?? "",
      full_name:         p?.full_name ?? "",
      account_number:    a.account_number,
      balance:           a.balance,
      opened_at:         formatDate(a.opened_at),
    }
  })

  const loansCSV = (loans ?? []).map((l) => {
    const m = l.member as any
    const p = m?.profile as any
    return {
      membership_number:   m?.membership_number ?? "",
      full_name:           p?.full_name ?? "",
      amount_applied:      l.amount_applied,
      amount_approved:     l.amount_approved ?? "",
      outstanding_balance: l.outstanding_balance ?? "",
      amount_repaid:       l.amount_repaid,
      status:              l.status,
      applied_at:          formatDate(l.applied_at),
      due_date:            l.due_date ? formatDate(l.due_date) : "",
    }
  })

  return (
    <div className="space-y-8 pb-20 lg:pb-0">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-stone-900"
              style={{ fontFamily: "var(--font-heading, serif)" }}>
            Reports
          </h2>
          <p className="text-sm text-stone-500 mt-0.5">
            Financial overview and exportable reports for your SACCO
          </p>
        </div>
      </div>

      {/* ── Section 1: Financial Summary ─────────────────────────────────── */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold text-stone-800"
            style={{ fontFamily: "var(--font-heading, serif)" }}>
          Financial Summary
        </h3>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label:     "Total Savings",
              value:     formatUGX(totalSavings),
              sub:       `${totalMembers ?? 0} active members`,
              icon:      PiggyBank,
              iconBg:    "bg-green-50",
              iconColor: "text-green-700",
            },
            {
              label:     "Total Disbursed",
              value:     formatUGX(totalDisbursed),
              sub:       `${activeLoans.length} active, ${completedLoans.length} completed`,
              icon:      CreditCard,
              iconBg:    "bg-orange-50",
              iconColor: "text-orange-600",
            },
            {
              label:     "Outstanding Loans",
              value:     formatUGX(totalOutstanding),
              sub:       `Across ${activeLoans.length} active loan${activeLoans.length !== 1 ? "s" : ""}`,
              icon:      TrendingUp,
              iconBg:    "bg-red-50",
              iconColor: "text-red-500",
            },
            {
              label:     "Total Repaid",
              value:     formatUGX(totalRepaid),
              sub:       `${completedLoans.length} loan${completedLoans.length !== 1 ? "s" : ""} completed`,
              icon:      BarChart3,
              iconBg:    "bg-blue-50",
              iconColor: "text-blue-600",
            },
          ].map((card) => {
            const Icon = card.icon
            return (
              <div key={card.label} className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
                <div className={`w-10 h-10 ${card.iconBg} rounded-xl flex items-center justify-center mb-3`}>
                  <Icon className={`w-5 h-5 ${card.iconColor}`} />
                </div>
                <p className="text-xl font-bold text-stone-900"
                   style={{ fontFamily: "var(--font-heading, serif)" }}>
                  {card.value}
                </p>
                <p className="text-sm text-stone-500">{card.label}</p>
                <p className="text-xs text-stone-400 mt-0.5">{card.sub}</p>
              </div>
            )
          })}
        </div>

        {/* Last 30 days activity */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
          <p className="text-sm font-semibold text-stone-700 mb-4">
            Activity — Last 30 Days
          </p>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Deposits",    value: formatUGX(depositsThisMonth),    color: "text-green-700" },
              { label: "Withdrawals", value: formatUGX(withdrawalsThisMonth), color: "text-red-600"   },
              { label: "Repayments",  value: formatUGX(repaymentsThisMonth),  color: "text-blue-600"  },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <p className={`text-lg font-bold ${item.color}`}
                   style={{ fontFamily: "var(--font-heading, serif)" }}>
                  {item.value}
                </p>
                <p className="text-xs text-stone-400">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 2: Savings Report ─────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-stone-800"
              style={{ fontFamily: "var(--font-heading, serif)" }}>
            Savings Report
          </h3>
          <ReportExportButtons
            filename="savings-report"
            data={savingsCSV}
            headers={["Membership No.", "Full Name", "Account No.", "Balance (UGX)", "Opened"]}
            keys={["membership_number", "full_name", "account_number", "balance", "opened_at"]}
          />
        </div>

        {zeroBalanceMembers.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm text-amber-800">
              <span className="font-semibold">{zeroBalanceMembers.length} member{zeroBalanceMembers.length > 1 ? "s" : ""}</span> have zero balance in their savings accounts.
            </p>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50">
                  {["Member", "Membership No.", "Account", "Balance", "Opened"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {(savingsAccounts ?? []).map((account) => {
                  const m = account.member as any
                  const p = m?.profile as any
                  return (
                    <tr key={account.id} className="hover:bg-stone-50">
                      <td className="px-4 py-3 text-sm font-medium text-stone-900">{p?.full_name ?? "—"}</td>
                      <td className="px-4 py-3 text-sm text-stone-500 font-mono">{m?.membership_number ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-stone-400 font-mono">{account.account_number}</td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-bold ${account.balance === 0 ? "text-stone-400" : "text-stone-900"}`}>
                          {formatUGX(account.balance)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-stone-400">{formatDate(account.opened_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
              {/* Totals row */}
              <tfoot>
                <tr className="border-t-2 border-stone-200 bg-stone-50">
                  <td className="px-4 py-3 text-sm font-bold text-stone-900" colSpan={3}>
                    Total ({savingsAccounts?.length ?? 0} accounts)
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-green-700">{formatUGX(totalSavings)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </section>

      {/* ── Section 3: Loan Portfolio ─────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-stone-800"
              style={{ fontFamily: "var(--font-heading, serif)" }}>
            Loan Portfolio
          </h3>
          <ReportExportButtons
            filename="loan-portfolio"
            data={loansCSV}
            headers={["Membership No.", "Full Name", "Applied (UGX)", "Approved (UGX)", "Outstanding (UGX)", "Repaid (UGX)", "Status", "Applied Date", "Due Date"]}
            keys={["membership_number", "full_name", "amount_applied", "amount_approved", "outstanding_balance", "amount_repaid", "status", "applied_at", "due_date"]}
          />
        </div>

        {/* Loan status breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Pending",   count: pendingLoans.length,   color: "bg-amber-50 text-amber-700"  },
            { label: "Active",    count: activeLoans.length,    color: "bg-green-50 text-green-700"  },
            { label: "Completed", count: completedLoans.length, color: "bg-stone-100 text-stone-600" },
            { label: "Defaulted", count: loans?.filter((l) => l.status === "defaulted").length ?? 0, color: "bg-red-50 text-red-600" },
          ].map((item) => (
            <div key={item.label} className={`${item.color} rounded-xl p-3 border border-stone-100 text-center`}>
              <p className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading, serif)" }}>
                {item.count}
              </p>
              <p className="text-xs mt-0.5">{item.label}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50">
                  {["Member", "Approved", "Outstanding", "Repaid", "Status", "Due Date"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {(loans ?? []).map((loan) => {
                  const m = loan.member as any
                  const p = m?.profile as any
                  const STATUS_COLORS: Record<string, string> = {
                    pending:   "bg-amber-50 text-amber-700",
                    approved:  "bg-blue-50 text-blue-700",
                    active:    "bg-green-50 text-green-700",
                    disbursed: "bg-purple-50 text-purple-700",
                    completed: "bg-stone-100 text-stone-500",
                    defaulted: "bg-red-50 text-red-600",
                    rejected:  "bg-red-50 text-red-400",
                  }
                  return (
                    <tr key={loan.id} className="hover:bg-stone-50">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-stone-900">{p?.full_name ?? "—"}</p>
                        <p className="text-xs text-stone-400">{m?.membership_number}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-stone-700">
                        {loan.amount_approved ? formatUGX(loan.amount_approved) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-semibold ${(loan.outstanding_balance ?? 0) > 0 ? "text-orange-600" : "text-stone-400"}`}>
                          {formatUGX(loan.outstanding_balance ?? 0)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-stone-600">
                        {formatUGX(loan.amount_repaid)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[loan.status] ?? ""}`}>
                          {loan.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-stone-400">
                        {loan.due_date ? formatDate(loan.due_date) : "—"}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {/* Totals row */}
              {(loans?.length ?? 0) > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-stone-200 bg-stone-50">
                    <td className="px-4 py-3 text-sm font-bold text-stone-900">
                      Total ({loans?.length ?? 0} loans)
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-stone-700">{formatUGX(totalDisbursed)}</td>
                    <td className="px-4 py-3 text-sm font-bold text-orange-600">{formatUGX(totalOutstanding)}</td>
                    <td className="px-4 py-3 text-sm font-bold text-green-700">{formatUGX(totalRepaid)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </section>

      {/* ── Section 4: Members Overview ───────────────────────────────────── */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold text-stone-800"
            style={{ fontFamily: "var(--font-heading, serif)" }}>
          Members Overview
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              label: "Active Members",
              value: totalMembers ?? 0,
              icon:  Users,
              bg:    "bg-green-50",
              color: "text-green-700",
            },
            {
              label: "Members with Savings",
              value: (savingsAccounts?.filter((a) => a.balance > 0).length ?? 0),
              icon:  PiggyBank,
              bg:    "bg-blue-50",
              color: "text-blue-700",
            },
            {
              label: "Members with Active Loans",
              value: activeLoans.length,
              icon:  CreditCard,
              bg:    "bg-orange-50",
              color: "text-orange-600",
            },
          ].map((card) => {
            const Icon = card.icon
            return (
              <div key={card.label} className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 flex items-center gap-4">
                <div className={`w-12 h-12 ${card.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-6 h-6 ${card.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-stone-900"
                     style={{ fontFamily: "var(--font-heading, serif)" }}>
                    {card.value}
                  </p>
                  <p className="text-sm text-stone-500">{card.label}</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

    </div>
  )
}
