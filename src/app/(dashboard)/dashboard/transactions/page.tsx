// FILE: src/app/(dashboard)/dashboard/transactions/page.tsx
// ACTION: REPLACE
// FIX: member name now shows on each transaction row (was hidden before)
// FIX: profile array handling

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Wallet, Plus, ArrowDownRight, ArrowUpRight, Filter } from "lucide-react"
import { formatUGX, formatDate, getInitials } from "@/lib/utils"

export const metadata = { title: "Transactions" }

const TXN_TYPE_LABELS: Record<string, string> = {
  deposit:           "Deposit",
  withdrawal:        "Withdrawal",
  loan_disbursement: "Loan Disbursement",
  loan_repayment:    "Loan Repayment",
  fee:               "Fee",
  interest:          "Interest",
  transfer:          "Transfer",
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  mobile_money:  "Mobile Money",
  bank_transfer: "Bank Transfer",
  cash:          "Cash",
  cheque:        "Cheque",
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: { type?: string; page?: string }
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
  const typeFilter = searchParams.type ?? "all"
  const page       = Math.max(1, parseInt(searchParams.page ?? "1"))
  const pageSize   = 20
  const offset     = (page - 1) * pageSize

  let transactions: any[] = []
  let totalCount = 0

  if (isAdmin) {
    let query = supabase
      .from("transactions")
      .select(`
        id,
        transaction_type,
        amount,
        balance_before,
        balance_after,
        status,
        reference_no,
        description,
        payment_method,
        created_at,
        account:accounts(
          account_number,
          account_type,
          member:members(
            id,
            membership_number,
            profile:profiles!user_id(full_name)
          )
        )
      `, { count: "exact" })
      .eq("sacco_id", sacco_id)
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1)

    if (typeFilter !== "all") query = query.eq("transaction_type", typeFilter)

    const { data, count, error } = await query
    if (error) console.error("Transactions fetch error:", error.message)
    transactions = data ?? []
    totalCount   = count ?? 0

  } else {
    const { data: member } = await supabase
      .from("members")
      .select("id")
      .eq("user_id", user.id)
      .eq("sacco_id", sacco_id)
      .single()

    if (member) {
      const { data: accountData } = await supabase
        .from("accounts")
        .select("id")
        .eq("member_id", member.id)
        .eq("sacco_id", sacco_id)

      const accountIds = accountData?.map((a) => a.id) ?? []

      if (accountIds.length > 0) {
        let query = supabase
          .from("transactions")
          .select(`
            id, transaction_type, amount, balance_before, balance_after,
            status, reference_no, description, payment_method, created_at,
            account:accounts(account_number, account_type)
          `, { count: "exact" })
          .in("account_id", accountIds)
          .order("created_at", { ascending: false })
          .range(offset, offset + pageSize - 1)

        if (typeFilter !== "all") query = query.eq("transaction_type", typeFilter)

        const { data, count } = await query
        transactions = data ?? []
        totalCount   = count ?? 0
      }
    }
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  const totalDeposits    = transactions.filter((t) => t.transaction_type === "deposit").reduce((s, t) => s + t.amount, 0)
  const totalWithdrawals = transactions.filter((t) => t.transaction_type === "withdrawal").reduce((s, t) => s + t.amount, 0)

  // Helper to get member name from nested join
  function getMemberName(txn: any): string | null {
    const account = txn.account
    if (!account) return null
    const member  = Array.isArray(account) ? account[0]?.member : account?.member
    if (!member) return null
    const m       = Array.isArray(member) ? member[0] : member
    if (!m) return null
    const profile = Array.isArray(m.profile) ? m.profile[0] : m.profile
    return profile?.full_name ?? m.membership_number ?? null
  }

  function getMemberNo(txn: any): string | null {
    const account = txn.account
    if (!account) return null
    const member  = Array.isArray(account) ? account[0]?.member : account?.member
    if (!member) return null
    const m       = Array.isArray(member) ? member[0] : member
    return m?.membership_number ?? null
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-0">

      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-stone-900"
              style={{ fontFamily: "var(--font-heading, serif)" }}>Transactions</h2>
          <p className="text-sm text-stone-500 mt-0.5">
            {totalCount} total transaction{totalCount !== 1 ? "s" : ""}
          </p>
        </div>
        {isAdmin && (
          <Link href="/dashboard/transactions/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded-xl transition-colors">
            <Plus className="w-4 h-4" />
            New Transaction
          </Link>
        )}
      </div>

      {/* Quick stats */}
      {transactions.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
            <p className="text-xs text-blue-600 font-medium mb-1">Deposits (this page)</p>
            <p className="text-xl font-bold text-blue-700"
               style={{ fontFamily: "var(--font-heading, serif)" }}>
              {formatUGX(totalDeposits)}
            </p>
          </div>
          <div className="bg-red-50 rounded-2xl p-4 border border-red-100">
            <p className="text-xs text-red-600 font-medium mb-1">Withdrawals (this page)</p>
            <p className="text-xl font-bold text-red-600"
               style={{ fontFamily: "var(--font-heading, serif)" }}>
              {formatUGX(totalWithdrawals)}
            </p>
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-stone-500 text-sm">
            <Filter className="w-4 h-4" />
            <span className="font-medium">Filter:</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              { value: "all",               label: "All"           },
              { value: "deposit",           label: "Deposits"      },
              { value: "withdrawal",        label: "Withdrawals"   },
              { value: "loan_repayment",    label: "Repayments"    },
              { value: "loan_disbursement", label: "Disbursements" },
            ].map((f) => (
              <Link key={f.value} href={`/dashboard/transactions?type=${f.value}`}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  typeFilter === f.value
                    ? "bg-blue-700 text-white"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}>
                {f.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Transactions list */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
        {transactions.length === 0 ? (
          <div className="py-16 text-center">
            <Wallet className="w-8 h-8 text-stone-300 mx-auto mb-3" />
            <p className="text-stone-500 font-medium text-sm mb-1">No transactions found</p>
            <p className="text-stone-400 text-xs">
              {isAdmin ? "Record the first transaction to get started." : "No transactions yet."}
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-stone-50">
              {transactions.map((txn) => {
                const isCredit    = ["deposit", "loan_disbursement", "interest"].includes(txn.transaction_type)
                const memberName  = isAdmin ? getMemberName(txn) : null
                const memberNo    = isAdmin ? getMemberNo(txn) : null

                return (
                  <div key={txn.id} className="px-5 py-4 hover:bg-stone-50 transition-colors">
                    <div className="flex items-center gap-4">

                      {/* Member avatar — admin only */}
                      {isAdmin && memberName && (
                        <div className="w-9 h-9 bg-blue-700 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs font-bold">
                            {getInitials(memberName)}
                          </span>
                        </div>
                      )}

                      {/* Direction icon — member view or when no name */}
                      {(!isAdmin || !memberName) && (
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isCredit ? "bg-blue-50" : "bg-red-50"}`}>
                          {isCredit
                            ? <ArrowDownRight className="w-4 h-4 text-blue-600" />
                            : <ArrowUpRight className="w-4 h-4 text-red-500" />
                          }
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
                          <div>
                            {/* Member name — prominent for admin */}
                            {isAdmin && memberName && (
                              <p className="text-sm font-bold text-stone-900">{memberName}</p>
                            )}
                            <p className={`text-sm ${isAdmin && memberName ? "text-stone-500" : "font-semibold text-stone-800"}`}>
                              {TXN_TYPE_LABELS[txn.transaction_type] ?? txn.transaction_type}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-0.5">
                              {isAdmin && memberNo && (
                                <span className="text-xs text-stone-400 font-mono">{memberNo}</span>
                              )}
                              {txn.payment_method && (
                                <span className="text-xs text-stone-400">
                                  · {PAYMENT_METHOD_LABELS[txn.payment_method] ?? txn.payment_method}
                                </span>
                              )}
                              {txn.reference_no && (
                                <span className="text-xs font-mono text-stone-400">{txn.reference_no}</span>
                              )}
                              <span className="text-xs text-stone-400">{formatDate(txn.created_at)}</span>
                            </div>
                            {txn.description && (
                              <p className="text-xs text-stone-400 mt-0.5 truncate max-w-xs">{txn.description}</p>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className={`text-base font-bold ${isCredit ? "text-blue-700" : "text-red-600"}`}>
                              {isCredit ? "+" : "-"}{formatUGX(txn.amount)}
                            </p>
                            <p className="text-xs text-stone-400">Bal: {formatUGX(txn.balance_after)}</p>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              txn.status === "completed" ? "bg-blue-50 text-blue-700"
                              : txn.status === "pending"  ? "bg-amber-50 text-amber-700"
                              : "bg-red-50 text-red-600"
                            }`}>
                              {txn.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {totalPages > 1 && (
              <div className="px-5 py-4 border-t border-stone-100 flex items-center justify-between">
                <p className="text-xs text-stone-500">Page {page} of {totalPages} · {totalCount} total</p>
                <div className="flex gap-2">
                  {page > 1 && (
                    <Link href={`/dashboard/transactions?type=${typeFilter}&page=${page - 1}`}
                      className="px-3 py-1.5 text-xs font-medium border border-stone-200 rounded-lg hover:bg-stone-50">
                      ← Previous
                    </Link>
                  )}
                  {page < totalPages && (
                    <Link href={`/dashboard/transactions?type=${typeFilter}&page=${page + 1}`}
                      className="px-3 py-1.5 text-xs font-medium bg-blue-700 text-white rounded-lg hover:bg-blue-800">
                      Next →
                    </Link>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
