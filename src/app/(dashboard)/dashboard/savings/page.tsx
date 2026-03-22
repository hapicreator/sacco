// FILE: src/app/(dashboard)/dashboard/savings/page.tsx
// ACTION: REPLACE
// FIX: getUser() instead of getSession(), defensive null handling

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { PiggyBank, Plus, TrendingUp, Users, ArrowDownRight, ArrowUpRight } from "lucide-react"
import { formatUGX, formatDate } from "@/lib/utils"

export const metadata = { title: "Savings" }

export default async function SavingsPage() {
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

  // ── Admin view ─────────────────────────────────────────────────────────────
  if (isAdmin) {
    const { data: accounts, error } = await supabase
      .from("accounts")
      .select(`
        id,
        account_number,
        balance,
        currency,
        is_active,
        opened_at,
        member:members(
          id,
          membership_number,
          profile:profiles(full_name, phone)
        )
      `)
      .eq("sacco_id", sacco_id)
      .eq("account_type", "savings")
      .order("balance", { ascending: false })

    if (error) console.error("Savings fetch error:", error.message)

    const allAccounts    = accounts ?? []
    const totalSavings   = allAccounts.reduce((s, a) => s + (a.balance ?? 0), 0)
    const activeAccounts = allAccounts.filter((a) => a.is_active).length
    const avgBalance     = activeAccounts > 0 ? totalSavings / activeAccounts : 0

    return (
      <div className="space-y-6 pb-20 lg:pb-0">

        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-stone-900"
                style={{ fontFamily: "var(--font-heading, serif)" }}>
              Savings Accounts
            </h2>
            <p className="text-sm text-stone-500 mt-0.5">All member savings in your SACCO</p>
          </div>
          <Link href="/dashboard/transactions/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-700 hover:bg-green-800 text-white text-sm font-semibold rounded-xl transition-colors">
            <Plus className="w-4 h-4" />
            Record Transaction
          </Link>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Total Savings",    value: formatUGX(totalSavings), icon: PiggyBank, color: "bg-green-50",  iconColor: "text-green-700"  },
            { label: "Active Accounts",  value: activeAccounts.toString(), icon: Users,    color: "bg-blue-50",   iconColor: "text-blue-600"   },
            { label: "Average Balance",  value: formatUGX(avgBalance),   icon: TrendingUp, color: "bg-purple-50", iconColor: "text-purple-600" },
          ].map((card) => {
            const Icon = card.icon
            return (
              <div key={card.label} className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
                <div className={`w-10 h-10 ${card.color} rounded-xl flex items-center justify-center mb-3`}>
                  <Icon className={`w-5 h-5 ${card.iconColor}`} />
                </div>
                <p className="text-2xl font-bold text-stone-900"
                   style={{ fontFamily: "var(--font-heading, serif)" }}>
                  {card.value}
                </p>
                <p className="text-sm text-stone-500">{card.label}</p>
              </div>
            )
          })}
        </div>

        {/* Accounts table */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-100">
            <h3 className="font-semibold text-stone-900"
                style={{ fontFamily: "var(--font-heading, serif)" }}>
              All Savings Accounts
            </h3>
          </div>

          {allAccounts.length === 0 ? (
            <div className="py-16 text-center">
              <PiggyBank className="w-8 h-8 text-stone-300 mx-auto mb-3" />
              <p className="text-stone-400 text-sm">No savings accounts yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-stone-100 bg-stone-50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Member</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider hidden sm:table-cell">Account No.</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider hidden md:table-cell">Opened</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Balance</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {allAccounts.map((account) => {
                    const member  = account.member as any
                    const profile = member?.profile as any
                    const name    = profile?.full_name ?? "Unknown"
                    const initials = name.split(" ").map((p: string) => p[0]).join("").toUpperCase().slice(0, 2)
                    return (
                      <tr key={account.id} className="hover:bg-stone-50 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-green-700 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-white text-xs font-bold">{initials}</span>
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-stone-900">{name}</p>
                              <p className="text-xs text-stone-400">{member?.membership_number}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 hidden sm:table-cell">
                          <span className="text-sm font-mono text-stone-600">{account.account_number}</span>
                        </td>
                        <td className="px-5 py-3.5 hidden md:table-cell">
                          <span className="text-sm text-stone-500">{formatDate(account.opened_at)}</span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span className="text-sm font-bold text-stone-900">{formatUGX(account.balance)}</span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${account.is_active ? "bg-green-50 text-green-700" : "bg-stone-100 text-stone-500"}`}>
                            {account.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
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

  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, account_number, balance, currency, is_active, opened_at, account_type")
    .eq("member_id", member?.id ?? "")
    .eq("sacco_id", sacco_id)
    .eq("account_type", "savings")

  const accountIds = accounts?.map((a) => a.id) ?? []

  const { data: transactions } = accountIds.length > 0
    ? await supabase
        .from("transactions")
        .select("id, transaction_type, amount, balance_after, status, description, created_at, payment_method")
        .in("account_id", accountIds)
        .order("created_at", { ascending: false })
        .limit(20)
    : { data: [] }

  const totalSavings = accounts?.reduce((s, a) => s + (a.balance ?? 0), 0) ?? 0

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <div>
        <h2 className="text-2xl font-bold text-stone-900"
            style={{ fontFamily: "var(--font-heading, serif)" }}>My Savings</h2>
        <p className="text-sm text-stone-500 mt-0.5">Your savings accounts and history</p>
      </div>

      {/* Balance hero */}
      <div className="bg-gradient-to-r from-green-700 to-green-600 rounded-2xl p-6 text-white">
        <p className="text-green-200 text-sm mb-1">Total Savings Balance</p>
        <p className="text-4xl font-bold mb-1" style={{ fontFamily: "var(--font-heading, serif)" }}>
          {formatUGX(totalSavings)}
        </p>
        <p className="text-green-200 text-xs">Membership: {member?.membership_number ?? "—"}</p>
      </div>

      {/* Accounts */}
      {accounts && accounts.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-100">
            <h3 className="font-semibold text-stone-900" style={{ fontFamily: "var(--font-heading, serif)" }}>Accounts</h3>
          </div>
          {accounts.map((account) => (
            <div key={account.id} className="px-5 py-4 flex items-center justify-between border-b border-stone-50 last:border-0">
              <div>
                <p className="text-sm font-semibold text-stone-800 capitalize">
                  {account.account_type.replace("_", " ")} Account
                </p>
                <p className="text-xs text-stone-400 font-mono">{account.account_number}</p>
                <p className="text-xs text-stone-400">Opened {formatDate(account.opened_at)}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-stone-900">{formatUGX(account.balance)}</p>
                <span className="text-xs text-green-600 font-medium">Active</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Transaction history */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100">
          <h3 className="font-semibold text-stone-900" style={{ fontFamily: "var(--font-heading, serif)" }}>
            Transaction History
          </h3>
        </div>

        {!transactions || transactions.length === 0 ? (
          <div className="py-12 text-center">
            <ArrowDownRight className="w-8 h-8 text-stone-300 mx-auto mb-3" />
            <p className="text-stone-400 text-sm">No transactions yet</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-50">
            {(transactions as any[]).map((txn) => {
              const isCredit = ["deposit", "loan_disbursement"].includes(txn.transaction_type)
              return (
                <div key={txn.id} className="px-5 py-3.5 flex items-center gap-4">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isCredit ? "bg-green-50" : "bg-red-50"}`}>
                    {isCredit
                      ? <ArrowDownRight className="w-4 h-4 text-green-600" />
                      : <ArrowUpRight className="w-4 h-4 text-red-500" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-800 capitalize">
                      {txn.transaction_type.replace(/_/g, " ")}
                    </p>
                    <p className="text-xs text-stone-400">
                      {formatDate(txn.created_at)}
                      {txn.payment_method && ` · ${txn.payment_method.replace("_", " ")}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${isCredit ? "text-green-700" : "text-red-600"}`}>
                      {isCredit ? "+" : "-"}{formatUGX(txn.amount)}
                    </p>
                    <p className="text-xs text-stone-400">Bal: {formatUGX(txn.balance_after)}</p>
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
