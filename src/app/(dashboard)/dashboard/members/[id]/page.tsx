// FILE: src/app/(dashboard)/dashboard/members/[id]/page.tsx
// ACTION: REPLACE
// FIX: getUser() instead of getSession(), defensive null handling

import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, Phone, User, Calendar,
  CreditCard, PiggyBank, FileText,
} from "lucide-react"
import { formatUGX, formatDate, getInitials } from "@/lib/utils"
import MemberStatusButton from "@/components/dashboard/MemberStatusButton"

export default async function MemberProfilePage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: currentSaccoUser } = await supabase
    .from("sacco_users")
    .select("sacco_id, role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single()

  if (!currentSaccoUser) redirect("/onboarding")
  if (currentSaccoUser.role === "member") redirect("/dashboard")

  const saccoId = currentSaccoUser.sacco_id

  const { data: member } = await supabase
    .from("members")
    .select(`
      id,
      membership_number,
      status,
      occupation,
      next_of_kin_name,
      next_of_kin_phone,
      notes,
      created_at,
      user_id,
      profile:profiles(full_name, phone, avatar_url, national_id, date_of_birth, gender)
    `)
    .eq("id", params.id)
    .eq("sacco_id", saccoId)
    .single()

  if (!member) notFound()

  const profile = member.profile as any

  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, account_type, account_number, balance, currency, is_active")
    .eq("member_id", member.id)
    .eq("sacco_id", saccoId)

  const { data: loans } = await supabase
    .from("loans")
    .select("id, amount_approved, outstanding_balance, status, applied_at, due_date")
    .eq("member_id", member.id)
    .eq("sacco_id", saccoId)
    .order("applied_at", { ascending: false })
    .limit(5)

  const accountIds = accounts?.map((a) => a.id) ?? []
  const { data: transactions } = accountIds.length > 0
    ? await supabase
        .from("transactions")
        .select("id, transaction_type, amount, status, created_at, description")
        .in("account_id", accountIds)
        .order("created_at", { ascending: false })
        .limit(5)
    : { data: [] }

  const totalSavings = accounts
    ?.filter((a) => a.account_type === "savings" && a.is_active)
    .reduce((sum, a) => sum + (a.balance ?? 0), 0) ?? 0

  const activeLoanBalance = loans
    ?.filter((l) => ["active", "disbursed"].includes(l.status))
    .reduce((sum, l) => sum + (l.outstanding_balance ?? 0), 0) ?? 0

  const STATUS_COLORS: Record<string, string> = {
    active:    "bg-green-50 text-green-700",
    inactive:  "bg-stone-100 text-stone-500",
    suspended: "bg-red-50 text-red-600",
    exited:    "bg-orange-50 text-orange-600",
  }

  const LOAN_STATUS_COLORS: Record<string, string> = {
    pending:   "bg-amber-50 text-amber-700",
    approved:  "bg-blue-50 text-blue-700",
    disbursed: "bg-green-50 text-green-700",
    active:    "bg-green-50 text-green-700",
    completed: "bg-stone-100 text-stone-500",
    defaulted: "bg-red-50 text-red-600",
    rejected:  "bg-red-50 text-red-500",
  }

  const memberName = profile?.full_name ?? "Unknown Member"

  return (
    <div className="space-y-6 pb-20 lg:pb-6 max-w-4xl">

      <Link href="/dashboard/members"
        className="inline-flex items-center gap-1.5 text-stone-400 hover:text-stone-600 text-sm transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Members
      </Link>

      {/* Profile header */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-5">
          <div className="w-16 h-16 bg-green-700 rounded-2xl flex items-center justify-center flex-shrink-0">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={memberName}
                className="w-full h-full rounded-2xl object-cover" />
            ) : (
              <span className="text-white text-xl font-bold">{getInitials(memberName)}</span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
              <h2 className="text-2xl font-bold text-stone-900"
                  style={{ fontFamily: "var(--font-heading, serif)" }}>
                {memberName}
              </h2>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full self-start capitalize ${STATUS_COLORS[member.status] ?? "bg-stone-100 text-stone-500"}`}>
                {member.status}
              </span>
            </div>
            <p className="text-sm text-stone-500 font-mono">{member.membership_number}</p>
            {member.occupation && (
              <p className="text-sm text-stone-500 mt-1">{member.occupation}</p>
            )}
          </div>

          {currentSaccoUser.role === "sacco_admin" && (
            <MemberStatusButton memberId={member.id} currentStatus={member.status} />
          )}
        </div>

        {/* Contact details */}
        <div className="mt-5 pt-5 border-t border-stone-100 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: Phone,    label: "Phone",       value: profile?.phone ?? "—" },
            { icon: User,     label: "National ID",  value: profile?.national_id ?? "—" },
            { icon: Calendar, label: "Date of Birth", value: profile?.date_of_birth ? formatDate(profile.date_of_birth) : "—" },
            { icon: User,     label: "Gender",       value: profile?.gender ?? "—" },
          ].map((item) => {
            const Icon = item.icon
            return (
              <div key={item.label}>
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className="w-3.5 h-3.5 text-stone-400" />
                  <span className="text-xs text-stone-400">{item.label}</span>
                </div>
                <p className="text-sm font-medium text-stone-700 capitalize">{item.value}</p>
              </div>
            )
          })}
        </div>

        <div className="mt-3 pt-3 border-t border-stone-100">
          <p className="text-xs text-stone-400">
            Member since <span className="font-medium text-stone-600">{formatDate(member.created_at)}</span>
          </p>
        </div>
      </div>

      {/* Financial summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
          <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center mb-3">
            <PiggyBank className="w-5 h-5 text-green-700" />
          </div>
          <p className="text-2xl font-bold text-stone-900"
             style={{ fontFamily: "var(--font-heading, serif)" }}>
            {formatUGX(totalSavings)}
          </p>
          <p className="text-sm text-stone-500">Total Savings</p>
        </div>
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
          <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center mb-3">
            <CreditCard className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-2xl font-bold text-stone-900"
             style={{ fontFamily: "var(--font-heading, serif)" }}>
            {activeLoanBalance > 0 ? formatUGX(activeLoanBalance) : "No loan"}
          </p>
          <p className="text-sm text-stone-500">Outstanding Loan</p>
        </div>
      </div>

      {/* Accounts */}
      {accounts && accounts.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-100">
            <h3 className="font-semibold text-stone-900"
                style={{ fontFamily: "var(--font-heading, serif)" }}>Accounts</h3>
          </div>
          <div className="divide-y divide-stone-50">
            {accounts.map((account) => (
              <div key={account.id} className="px-5 py-3.5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-stone-800 capitalize">
                    {account.account_type.replace("_", " ")} Account
                  </p>
                  <p className="text-xs text-stone-400 font-mono">{account.account_number}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-stone-900">{formatUGX(account.balance)}</p>
                  <span className={`text-xs ${account.is_active ? "text-green-600" : "text-stone-400"}`}>
                    {account.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loans */}
      {loans && loans.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-100">
            <h3 className="font-semibold text-stone-900"
                style={{ fontFamily: "var(--font-heading, serif)" }}>Loans</h3>
          </div>
          <div className="divide-y divide-stone-50">
            {loans.map((loan) => (
              <div key={loan.id} className="px-5 py-3.5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-stone-800">
                    {formatUGX(loan.amount_approved ?? 0)}
                  </p>
                  <p className="text-xs text-stone-400">
                    Applied {formatDate(loan.applied_at)}
                    {loan.due_date && ` · Due ${formatDate(loan.due_date)}`}
                  </p>
                </div>
                <div className="text-right">
                  {loan.outstanding_balance != null && loan.outstanding_balance > 0 && (
                    <p className="text-xs text-stone-500 mb-1">
                      Balance: {formatUGX(loan.outstanding_balance)}
                    </p>
                  )}
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${LOAN_STATUS_COLORS[loan.status] ?? "bg-stone-100 text-stone-500"}`}>
                    {loan.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      {transactions && transactions.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-100">
            <h3 className="font-semibold text-stone-900"
                style={{ fontFamily: "var(--font-heading, serif)" }}>Recent Transactions</h3>
          </div>
          <div className="divide-y divide-stone-50">
            {(transactions as any[]).map((txn) => {
              const isCredit = ["deposit", "loan_disbursement"].includes(txn.transaction_type)
              return (
                <div key={txn.id} className="px-5 py-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-stone-800 capitalize">
                      {txn.transaction_type.replace(/_/g, " ")}
                    </p>
                    <p className="text-xs text-stone-400">{formatDate(txn.created_at)}</p>
                  </div>
                  <p className={`text-sm font-semibold ${isCredit ? "text-green-700" : "text-red-600"}`}>
                    {isCredit ? "+" : "-"}{formatUGX(txn.amount)}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Next of kin */}
      {(member.next_of_kin_name || member.next_of_kin_phone) && (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
          <h3 className="font-semibold text-stone-900 mb-3"
              style={{ fontFamily: "var(--font-heading, serif)" }}>Next of Kin</h3>
          <p className="text-sm font-medium text-stone-700">{member.next_of_kin_name ?? "—"}</p>
          <p className="text-sm text-stone-500">{member.next_of_kin_phone ?? "—"}</p>
        </div>
      )}

      {/* Notes */}
      {member.notes && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-amber-600" />
            <h3 className="font-semibold text-amber-800 text-sm">Notes</h3>
          </div>
          <p className="text-sm text-amber-700 leading-relaxed">{member.notes}</p>
        </div>
      )}
    </div>
  )
}
