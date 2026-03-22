// FILE: src/app/(dashboard)/dashboard/reports/page.tsx
// ACTION: REPLACE
// NEW: Savings leaderboard, top savers chart, transaction stats by member, loan rankings

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import {
  BarChart3, TrendingUp, Users, PiggyBank,
  CreditCard, Download, Trophy, ArrowUpRight
} from "lucide-react"
import { formatUGX, formatDate } from "@/lib/utils"
import ReportExportButtons from "@/components/dashboard/ReportExportButtons"

export const metadata = { title: "Reports" }

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { view?: string }
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
  if (saccoUser.role === "member") redirect("/dashboard")

  const { sacco_id } = saccoUser
  const activeView   = searchParams.view ?? "overview"

  // ── Fetch all data ─────────────────────────────────────────────────────────
  const { count: totalMembers } = await supabase
    .from("members").select("id", { count: "exact", head: true })
    .eq("sacco_id", sacco_id).eq("status", "active")

  const { data: savingsAccounts } = await supabase
    .from("accounts")
    .select(`
      id, account_number, balance, opened_at,
      member:members(
        id, membership_number,
        profile:profiles!user_id(full_name, phone)
      )
    `)
    .eq("sacco_id", sacco_id).eq("account_type", "savings").eq("is_active", true)
    .order("balance", { ascending: false })

  const { data: loans } = await supabase
    .from("loans")
    .select(`
      id, amount_applied, amount_approved, outstanding_balance,
      amount_repaid, total_repayable, status, interest_rate,
      duration_months, applied_at, disbursed_at, due_date,
      member:members(
        membership_number,
        profile:profiles!user_id(full_name)
      )
    `)
    .eq("sacco_id", sacco_id).order("applied_at", { ascending: false })

  const { data: allTransactions } = await supabase
    .from("transactions")
    .select(`
      id, transaction_type, amount, created_at,
      account:accounts(
        member:members(
          membership_number,
          profile:profiles!user_id(full_name)
        )
      )
    `)
    .eq("sacco_id", sacco_id).eq("status", "completed")
    .order("created_at", { ascending: false })

  // 30 day window
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const recentTxns = (allTransactions ?? []).filter(
    (t) => new Date(t.created_at) > thirtyDaysAgo
  )

  const depositsThisMonth    = recentTxns.filter((t) => t.transaction_type === "deposit").reduce((s, t) => s + t.amount, 0)
  const withdrawalsThisMonth = recentTxns.filter((t) => t.transaction_type === "withdrawal").reduce((s, t) => s + t.amount, 0)
  const repaymentsThisMonth  = recentTxns.filter((t) => t.transaction_type === "loan_repayment").reduce((s, t) => s + t.amount, 0)

  // Helper
  function getProfile(p: any) { if (!p) return null; if (Array.isArray(p)) return p[0] ?? null; return p }
  function getMember(m: any)  { if (!m) return null; if (Array.isArray(m)) return m[0] ?? null; return m }
  function getAccount(a: any) { if (!a) return null; if (Array.isArray(a)) return a[0] ?? null; return a }

  const allAccounts = savingsAccounts ?? []
  const allLoans    = loans ?? []

  const totalSavings     = allAccounts.reduce((s, a) => s + (a.balance ?? 0), 0)
  const activeLoans      = allLoans.filter((l) => ["active","disbursed"].includes(l.status))
  const completedLoans   = allLoans.filter((l) => l.status === "completed")
  const pendingLoans     = allLoans.filter((l) => l.status === "pending")
  const totalDisbursed   = allLoans.filter((l) => !["pending","rejected"].includes(l.status)).reduce((s, l) => s + (l.amount_approved ?? l.amount_applied), 0)
  const totalOutstanding = activeLoans.reduce((s, l) => s + (l.outstanding_balance ?? 0), 0)
  const totalRepaid      = allLoans.reduce((s, l) => s + (l.amount_repaid ?? 0), 0)

  // ── Savings leaderboard — top 10 savers ───────────────────────────────────
  const savingsLeaderboard = allAccounts.slice(0, 10).map((a, i) => {
    const m = getMember(a.member)
    const p = getProfile(m?.profile)
    return {
      rank:              i + 1,
      name:              p?.full_name ?? "Unknown",
      membership_number: m?.membership_number ?? "",
      balance:           a.balance,
      pct:               totalSavings > 0 ? Math.round((a.balance / totalSavings) * 100) : 0,
    }
  })

  // ── Members with most deposits ────────────────────────────────────────────
  const depositsByMember: Record<string, { name: string; total: number; count: number }> = {}
  for (const txn of allTransactions ?? []) {
    if (txn.transaction_type !== "deposit") continue
    const account = getAccount(txn.account)
    const member  = getMember(account?.member)
    const profile = getProfile(member?.profile)
    const key     = member?.membership_number ?? "unknown"
    const name    = profile?.full_name ?? key
    if (!depositsByMember[key]) depositsByMember[key] = { name, total: 0, count: 0 }
    depositsByMember[key].total += txn.amount
    depositsByMember[key].count += 1
  }
  const topDepositors = Object.entries(depositsByMember)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 10)

  // ── CSV data ───────────────────────────────────────────────────────────────
  const savingsCSV = allAccounts.map((a) => {
    const m = getMember(a.member); const p = getProfile(m?.profile)
    return { membership_number: m?.membership_number ?? "", full_name: p?.full_name ?? "", account_number: a.account_number, balance: a.balance, opened_at: formatDate(a.opened_at) }
  })
  const loansCSV = allLoans.map((l) => {
    const m = getMember(l.member); const p = getProfile(m?.profile)
    return { membership_number: m?.membership_number ?? "", full_name: p?.full_name ?? "", amount_applied: l.amount_applied, amount_approved: l.amount_approved ?? "", outstanding_balance: l.outstanding_balance ?? "", amount_repaid: l.amount_repaid, status: l.status, applied_at: formatDate(l.applied_at) }
  })

  // ── View tabs ──────────────────────────────────────────────────────────────
  const TABS = [
    { value: "overview",     label: "Overview"     },
    { value: "savings",      label: "Savings"      },
    { value: "loans",        label: "Loans"        },
    { value: "leaderboard",  label: "Leaderboard"  },
  ]

  return (
    <div className="space-y-6 pb-20 lg:pb-0">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-stone-900"
            style={{ fontFamily: "var(--font-heading, serif)" }}>Reports</h2>
        <p className="text-sm text-stone-500 mt-0.5">Financial overview and member statistics</p>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map((tab) => (
          <Link key={tab.value} href={`/dashboard/reports?view=${tab.value}`}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              activeView === tab.value
                ? "bg-blue-700 text-white"
                : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50"
            }`}>
            {tab.label}
          </Link>
        ))}
      </div>

      {/* ── OVERVIEW TAB ─────────────────────────────────────────────────── */}
      {activeView === "overview" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total Savings",     value: formatUGX(totalSavings),     icon: PiggyBank, iconBg: "bg-blue-50",   iconColor: "text-blue-700"  },
              { label: "Total Disbursed",   value: formatUGX(totalDisbursed),   icon: CreditCard, iconBg: "bg-orange-50", iconColor: "text-orange-600"},
              { label: "Outstanding Loans", value: formatUGX(totalOutstanding), icon: TrendingUp, iconBg: "bg-red-50",    iconColor: "text-red-500"   },
              { label: "Total Repaid",      value: formatUGX(totalRepaid),      icon: BarChart3,  iconBg: "bg-green-50",  iconColor: "text-green-600" },
            ].map((card) => {
              const Icon = card.icon
              return (
                <div key={card.label} className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
                  <div className={`w-10 h-10 ${card.iconBg} rounded-xl flex items-center justify-center mb-3`}>
                    <Icon className={`w-5 h-5 ${card.iconColor}`} />
                  </div>
                  <p className="text-xl font-bold text-stone-900"
                     style={{ fontFamily: "var(--font-heading, serif)" }}>{card.value}</p>
                  <p className="text-sm text-stone-500">{card.label}</p>
                </div>
              )
            })}
          </div>

          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
            <p className="text-sm font-semibold text-stone-700 mb-4">Last 30 Days Activity</p>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Deposits",    value: formatUGX(depositsThisMonth),    color: "text-blue-700"  },
                { label: "Withdrawals", value: formatUGX(withdrawalsThisMonth), color: "text-red-600"   },
                { label: "Repayments",  value: formatUGX(repaymentsThisMonth),  color: "text-green-600" },
              ].map((item) => (
                <div key={item.label} className="text-center p-3 bg-stone-50 rounded-xl">
                  <p className={`text-lg font-bold ${item.color}`}
                     style={{ fontFamily: "var(--font-heading, serif)" }}>{item.value}</p>
                  <p className="text-xs text-stone-400 mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Active Members",         value: totalMembers ?? 0,     color: "bg-blue-50 text-blue-700"   },
              { label: "Active Loans",           value: activeLoans.length,    color: "bg-orange-50 text-orange-600" },
              { label: "Completed Loans",        value: completedLoans.length, color: "bg-green-50 text-green-700"  },
              { label: "Pending Applications",   value: pendingLoans.length,   color: "bg-amber-50 text-amber-700"  },
            ].map((c) => (
              <div key={c.label} className={`${c.color} rounded-2xl p-4 border border-stone-100 text-center`}>
                <p className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading, serif)" }}>{c.value}</p>
                <p className="text-xs mt-0.5">{c.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SAVINGS TAB ──────────────────────────────────────────────────── */}
      {activeView === "savings" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-stone-800"
                style={{ fontFamily: "var(--font-heading, serif)" }}>Savings Report</h3>
            <ReportExportButtons
              filename="savings-report"
              data={savingsCSV}
              headers={["Membership No.", "Full Name", "Account No.", "Balance (UGX)", "Opened"]}
              keys={["membership_number", "full_name", "account_number", "balance", "opened_at"]}
            />
          </div>

          {allAccounts.filter((a) => a.balance === 0).length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-sm text-amber-800">
                <span className="font-semibold">{allAccounts.filter((a) => a.balance === 0).length} members</span> have zero balance.
              </p>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-stone-100 bg-stone-50">
                    {["#", "Member", "Membership No.", "Account", "Balance", "Opened"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {allAccounts.map((account, i) => {
                    const m = getMember(account.member); const p = getProfile(m?.profile)
                    const pct = totalSavings > 0 ? (account.balance / totalSavings) * 100 : 0
                    return (
                      <tr key={account.id} className="hover:bg-stone-50">
                        <td className="px-4 py-3 text-sm text-stone-400 font-medium">{i + 1}</td>
                        <td className="px-4 py-3 text-sm font-medium text-stone-900">{p?.full_name ?? "—"}</td>
                        <td className="px-4 py-3 text-sm text-stone-500 font-mono">{m?.membership_number ?? "—"}</td>
                        <td className="px-4 py-3 text-xs text-stone-400 font-mono">{account.account_number}</td>
                        <td className="px-4 py-3">
                          <div>
                            <span className={`text-sm font-bold ${account.balance === 0 ? "text-stone-400" : "text-stone-900"}`}>
                              {formatUGX(account.balance)}
                            </span>
                            <div className="mt-1 h-1.5 bg-stone-100 rounded-full w-24">
                              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(pct * 3, 100)}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-stone-400">{formatDate(account.opened_at)}</td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-stone-200 bg-stone-50">
                    <td className="px-4 py-3 text-sm font-bold text-stone-900" colSpan={4}>
                      Total ({allAccounts.length} accounts)
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-blue-700">{formatUGX(totalSavings)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── LOANS TAB ────────────────────────────────────────────────────── */}
      {activeView === "loans" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-stone-800"
                style={{ fontFamily: "var(--font-heading, serif)" }}>Loan Portfolio</h3>
            <ReportExportButtons
              filename="loan-portfolio"
              data={loansCSV}
              headers={["Membership No.", "Full Name", "Applied (UGX)", "Approved (UGX)", "Outstanding (UGX)", "Repaid (UGX)", "Status", "Applied Date"]}
              keys={["membership_number", "full_name", "amount_applied", "amount_approved", "outstanding_balance", "amount_repaid", "status", "applied_at"]}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Pending",   count: pendingLoans.length,                                    color: "bg-amber-50 text-amber-700"  },
              { label: "Active",    count: activeLoans.length,                                     color: "bg-blue-50 text-blue-700"    },
              { label: "Completed", count: completedLoans.length,                                  color: "bg-green-50 text-green-700"  },
              { label: "Defaulted", count: allLoans.filter((l) => l.status === "defaulted").length, color: "bg-red-50 text-red-600"      },
            ].map((s) => (
              <div key={s.label} className={`${s.color} rounded-xl p-3 border border-stone-100 text-center`}>
                <p className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading, serif)" }}>{s.count}</p>
                <p className="text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-stone-100 bg-stone-50">
                    {["Member", "Approved", "Outstanding", "Repaid", "Status", "Due Date"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {allLoans.map((loan) => {
                    const m = getMember(loan.member); const p = getProfile(m?.profile)
                    const STATUS_COLORS: Record<string, string> = {
                      pending:"bg-amber-50 text-amber-700", approved:"bg-blue-50 text-blue-700",
                      active:"bg-green-50 text-green-700", disbursed:"bg-purple-50 text-purple-700",
                      completed:"bg-stone-100 text-stone-500", defaulted:"bg-red-50 text-red-600",
                      rejected:"bg-red-50 text-red-400",
                    }
                    return (
                      <tr key={loan.id} className="hover:bg-stone-50">
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-stone-900">{p?.full_name ?? "—"}</p>
                          <p className="text-xs text-stone-400">{m?.membership_number}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-stone-700">{loan.amount_approved ? formatUGX(loan.amount_approved) : "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`text-sm font-semibold ${(loan.outstanding_balance ?? 0) > 0 ? "text-orange-600" : "text-stone-400"}`}>
                            {formatUGX(loan.outstanding_balance ?? 0)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-stone-600">{formatUGX(loan.amount_repaid)}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[loan.status] ?? ""}`}>
                            {loan.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-stone-400">{loan.due_date ? formatDate(loan.due_date) : "—"}</td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-stone-200 bg-stone-50">
                    <td className="px-4 py-3 text-sm font-bold text-stone-900">Total ({allLoans.length})</td>
                    <td className="px-4 py-3 text-sm font-bold text-stone-700">{formatUGX(totalDisbursed)}</td>
                    <td className="px-4 py-3 text-sm font-bold text-orange-600">{formatUGX(totalOutstanding)}</td>
                    <td className="px-4 py-3 text-sm font-bold text-green-600">{formatUGX(totalRepaid)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── LEADERBOARD TAB ──────────────────────────────────────────────── */}
      {activeView === "leaderboard" && (
        <div className="space-y-6">

          {/* Top savers */}
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-100 flex items-center gap-3">
              <Trophy className="w-5 h-5 text-amber-500" />
              <h3 className="font-semibold text-stone-900"
                  style={{ fontFamily: "var(--font-heading, serif)" }}>
                Top 10 Savers
              </h3>
            </div>
            <div className="divide-y divide-stone-50">
              {savingsLeaderboard.map((entry) => (
                <div key={entry.rank} className="px-5 py-3.5 flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm ${
                    entry.rank === 1 ? "bg-amber-100 text-amber-700"
                    : entry.rank === 2 ? "bg-stone-200 text-stone-600"
                    : entry.rank === 3 ? "bg-orange-100 text-orange-600"
                    : "bg-stone-100 text-stone-500"
                  }`}>
                    {entry.rank <= 3 ? ["🥇","🥈","🥉"][entry.rank - 1] : entry.rank}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-stone-900">{entry.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden max-w-32">
                        <div className="h-full bg-blue-500 rounded-full"
                             style={{ width: `${Math.min(entry.pct * 5, 100)}%` }} />
                      </div>
                      <span className="text-xs text-stone-400">{entry.pct}% of total</span>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-stone-900 flex-shrink-0">
                    {formatUGX(entry.balance)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Most active depositors */}
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-100 flex items-center gap-3">
              <ArrowUpRight className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-stone-900"
                  style={{ fontFamily: "var(--font-heading, serif)" }}>
                Most Active Depositors
              </h3>
            </div>
            <div className="divide-y divide-stone-50">
              {topDepositors.length === 0 ? (
                <div className="py-10 text-center text-stone-400 text-sm">No deposit data yet</div>
              ) : (
                topDepositors.map(([key, data], i) => (
                  <div key={key} className="px-5 py-3.5 flex items-center gap-4">
                    <div className="w-7 h-7 bg-blue-50 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-stone-900">{data.name}</p>
                      <p className="text-xs text-stone-400">{data.count} deposit{data.count !== 1 ? "s" : ""}</p>
                    </div>
                    <p className="text-sm font-bold text-blue-700 flex-shrink-0">
                      {formatUGX(data.total)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Members overview stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Active Members",           value: totalMembers ?? 0,                                    icon: Users,    bg: "bg-blue-50",   color: "text-blue-700"  },
              { label: "Members with Savings",     value: allAccounts.filter((a) => a.balance > 0).length,     icon: PiggyBank, bg: "bg-green-50", color: "text-green-700" },
              { label: "Members with Active Loans",value: activeLoans.length,                                  icon: CreditCard,bg: "bg-orange-50",color: "text-orange-600"},
            ].map((card) => {
              const Icon = card.icon
              return (
                <div key={card.label} className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 flex items-center gap-4">
                  <div className={`w-12 h-12 ${card.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-6 h-6 ${card.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-stone-900"
                       style={{ fontFamily: "var(--font-heading, serif)" }}>{card.value}</p>
                    <p className="text-sm text-stone-500">{card.label}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
