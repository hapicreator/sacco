// FILE: src/app/(dashboard)/dashboard/transactions/new/page.tsx
// ACTION: NEW
//
// Record a new transaction (deposit or withdrawal).
// Admin/Staff only. Looks up a member by membership number,
// shows their current balance, then records the transaction.

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, Search, CheckCircle, AlertCircle,
  Loader2, PiggyBank, ArrowDownRight, ArrowUpRight
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { formatUGX } from "@/lib/utils"

type TransactionType = "deposit" | "withdrawal"
type PaymentMethod = "mobile_money" | "bank_transfer" | "cash" | "cheque"

type FoundMember = {
  memberId: string
  accountId: string
  accountNumber: string
  fullName: string
  membershipNumber: string
  currentBalance: number
}

export default function NewTransactionPage() {
  const router = useRouter()

  // Step 1: Find member
  const [searchQuery, setSearchQuery]     = useState("")
  const [isSearching, setIsSearching]     = useState(false)
  const [searchError, setSearchError]     = useState<string | null>(null)
  const [foundMember, setFoundMember]     = useState<FoundMember | null>(null)

  // Step 2: Transaction details
  const [txnType, setTxnType]             = useState<TransactionType>("deposit")
  const [amount, setAmount]               = useState("")
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash")
  const [description, setDescription]    = useState("")
  const [isSubmitting, setIsSubmitting]   = useState(false)
  const [submitError, setSubmitError]     = useState<string | null>(null)
  const [isSuccess, setIsSuccess]         = useState(false)
  const [txnReference, setTxnReference]   = useState("")

  // ── Search for a member ────────────────────────────────────────────────────
  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setIsSearching(true)
    setSearchError(null)
    setFoundMember(null)

    const supabase = createClient()

    // Get current user's SACCO
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: saccoUser } = await supabase
      .from("sacco_users")
      .select("sacco_id, role")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single()

    if (!saccoUser) { setSearchError("Could not find your SACCO."); setIsSearching(false); return }

    // Role check: only admin/staff can record transactions
    if (!(["sacco_admin", "staff"].includes(saccoUser.role ?? ""))) {
      setSearchError("Only admins and staff can record transactions.")
      setIsSearching(false)
      return
    }

    // Find member by membership number or name
    const { data: members } = await supabase
      .from("members")
      .select(`
        id,
        membership_number,
        profile:profiles(full_name)
      `)
      .eq("sacco_id", saccoUser.sacco_id)
      .eq("status", "active")
      .ilike("membership_number", `%${searchQuery.trim()}%`)
      .limit(1)

    if (!members || members.length === 0) {
      setSearchError(`No active member found with membership number "${searchQuery}".`)
      setIsSearching(false)
      return
    }

    const member = members[0]
    const profile = member.profile as any

    // Get their savings account
    const { data: account } = await supabase
      .from("accounts")
      .select("id, account_number, balance")
      .eq("member_id", member.id)
      .eq("sacco_id", saccoUser.sacco_id)
      .eq("account_type", "savings")
      .eq("is_active", true)
      .single()

    if (!account) {
      setSearchError("This member has no active savings account.")
      setIsSearching(false)
      return
    }

    setFoundMember({
      memberId:         member.id,
      accountId:        account.id,
      accountNumber:    account.account_number,
      fullName:         profile?.full_name ?? "Unknown",
      membershipNumber: member.membership_number,
      currentBalance:   account.balance,
    })
    setIsSearching(false)
  }

  // ── Submit transaction ─────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!foundMember) return

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      setSubmitError("Please enter a valid amount greater than 0.")
      return
    }

    if (txnType === "withdrawal" && amountNum > foundMember.currentBalance) {
      setSubmitError(`Insufficient balance. Current balance is ${formatUGX(foundMember.currentBalance)}.`)
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: saccoUser } = await supabase
      .from("sacco_users")
      .select("sacco_id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single()

    if (!saccoUser) { setSubmitError("Could not find your SACCO."); setIsSubmitting(false); return }

    const balanceBefore = foundMember.currentBalance
    const balanceAfter  = txnType === "deposit"
      ? balanceBefore + amountNum
      : balanceBefore - amountNum

    // Generate reference number
    const refNo = `TXN-${Date.now()}`

    // Step 1: Record the transaction
    const { error: txnError } = await supabase
      .from("transactions")
      .insert({
        sacco_id:         saccoUser.sacco_id,
        account_id:       foundMember.accountId,
        transaction_type: txnType,
        amount:           amountNum,
        balance_before:   balanceBefore,
        balance_after:    balanceAfter,
        status:           "completed",
        reference_no:     refNo,
        description:      description || null,
        payment_method:   paymentMethod,
        performed_by:     user.id,
      })

    if (txnError) {
      setSubmitError(txnError.message)
      setIsSubmitting(false)
      return
    }

    // Step 2: Update the account balance
    const { error: balanceError } = await supabase
      .from("accounts")
      .update({ balance: balanceAfter })
      .eq("id", foundMember.accountId)

    if (balanceError) {
      setSubmitError("Transaction recorded but balance update failed. Contact support.")
      setIsSubmitting(false)
      return
    }

    // Step 3: Create a notification for the member
    const { data: memberUser } = await supabase
      .from("sacco_users")
      .select("user_id")
      .eq("sacco_id", saccoUser.sacco_id)
      .eq("user_id", (await supabase.from("members").select("user_id").eq("id", foundMember.memberId).single()).data?.user_id ?? "")
      .single()

    // Create notification
    await supabase.from("notifications").insert({
      sacco_id:          saccoUser.sacco_id,
      recipient_user_id: (await supabase.from("members").select("user_id").eq("id", foundMember.memberId).single()).data?.user_id,
      type:              txnType === "deposit" ? "deposit_received" : "general",
      title:             txnType === "deposit" ? "Deposit Received" : "Withdrawal Processed",
      message:           `${formatUGX(amountNum)} has been ${txnType === "deposit" ? "deposited to" : "withdrawn from"} your savings account. New balance: ${formatUGX(balanceAfter)}.`,
    })

    setTxnReference(refNo)
    setIsSubmitting(false)
    setIsSuccess(true)
  }

  // ── Success screen ─────────────────────────────────────────────────────────
  if (isSuccess && foundMember) {
    const amountNum = parseFloat(amount)
    const newBalance = txnType === "deposit"
      ? foundMember.currentBalance + amountNum
      : foundMember.currentBalance - amountNum

    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-stone-900 mb-2"
              style={{ fontFamily: "var(--font-heading, serif)" }}>
            Transaction Complete!
          </h2>
          <p className="text-stone-500 text-sm mb-5">
            {txnType === "deposit" ? "Deposit" : "Withdrawal"} of{" "}
            <span className="font-bold text-stone-800">{formatUGX(parseFloat(amount))}</span>{" "}
            {txnType === "deposit" ? "to" : "from"}{" "}
            <span className="font-bold text-stone-800">{foundMember.fullName}</span>
          </p>

          {/* Receipt summary */}
          <div className="bg-stone-50 rounded-xl p-4 text-left space-y-2 mb-6 text-sm">
            {[
              { label: "Reference",      value: txnReference },
              { label: "Member",         value: foundMember.fullName },
              { label: "Membership No.", value: foundMember.membershipNumber },
              { label: "Account",        value: foundMember.accountNumber },
              { label: "Type",           value: txnType.charAt(0).toUpperCase() + txnType.slice(1) },
              { label: "Amount",         value: formatUGX(parseFloat(amount)) },
              { label: "New Balance",    value: formatUGX(newBalance) },
              { label: "Payment",        value: paymentMethod.replace("_", " ") },
            ].map((row) => (
              <div key={row.label} className="flex justify-between">
                <span className="text-stone-500">{row.label}</span>
                <span className="font-medium text-stone-800 capitalize">{row.value}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => {
                setIsSuccess(false)
                setFoundMember(null)
                setSearchQuery("")
                setAmount("")
                setDescription("")
              }}
              className="flex-1 py-2.5 px-4 bg-green-700 hover:bg-green-800 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              New Transaction
            </button>
            <Link
              href="/dashboard/transactions"
              className="flex-1 py-2.5 px-4 border-2 border-stone-200 text-stone-600 hover:bg-stone-50 text-sm font-semibold rounded-xl transition-colors text-center"
            >
              View All Transactions
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ── Main form ──────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20 lg:pb-6">

      {/* Header */}
      <div>
        <Link
          href="/dashboard/transactions"
          className="inline-flex items-center gap-1.5 text-stone-400 hover:text-stone-600 text-sm mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Transactions
        </Link>
        <h2 className="text-2xl font-bold text-stone-900"
            style={{ fontFamily: "var(--font-heading, serif)" }}>
          Record Transaction
        </h2>
        <p className="text-sm text-stone-500 mt-0.5">
          Search for a member, then enter the transaction details.
        </p>
      </div>

      {/* Step 1: Find member */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
        <h3 className="font-semibold text-stone-900 mb-4"
            style={{ fontFamily: "var(--font-heading, serif)" }}>
          Step 1 — Find Member
        </h3>

        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              placeholder="Enter membership number e.g. KKA-2025-001"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching || !searchQuery.trim()}
            className="px-5 py-3 bg-green-700 hover:bg-green-800 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
          >
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
          </button>
        </form>

        {searchError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-red-700 text-sm">{searchError}</p>
          </div>
        )}

        {/* Found member card */}
        {foundMember && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-green-900">{foundMember.fullName}</p>
                <p className="text-sm text-green-700">{foundMember.membershipNumber}</p>
                <p className="text-xs text-green-600 font-mono mt-1">{foundMember.accountNumber}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-green-600">Current Balance</p>
                <p className="text-lg font-bold text-green-800"
                   style={{ fontFamily: "var(--font-heading, serif)" }}>
                  {formatUGX(foundMember.currentBalance)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Step 2: Transaction details */}
      {foundMember && (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 space-y-5">
            <h3 className="font-semibold text-stone-900"
                style={{ fontFamily: "var(--font-heading, serif)" }}>
              Step 2 — Transaction Details
            </h3>

            {/* Transaction type toggle */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Transaction type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTxnType("deposit")}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    txnType === "deposit"
                      ? "border-green-600 bg-green-50"
                      : "border-stone-200 hover:border-stone-300"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    txnType === "deposit" ? "bg-green-600" : "bg-stone-100"
                  }`}>
                    <ArrowDownRight className={`w-4 h-4 ${txnType === "deposit" ? "text-white" : "text-stone-500"}`} />
                  </div>
                  <div className="text-left">
                    <p className={`text-sm font-semibold ${txnType === "deposit" ? "text-green-800" : "text-stone-700"}`}>
                      Deposit
                    </p>
                    <p className="text-xs text-stone-400">Add money</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setTxnType("withdrawal")}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    txnType === "withdrawal"
                      ? "border-red-400 bg-red-50"
                      : "border-stone-200 hover:border-stone-300"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    txnType === "withdrawal" ? "bg-red-500" : "bg-stone-100"
                  }`}>
                    <ArrowUpRight className={`w-4 h-4 ${txnType === "withdrawal" ? "text-white" : "text-stone-500"}`} />
                  </div>
                  <div className="text-left">
                    <p className={`text-sm font-semibold ${txnType === "withdrawal" ? "text-red-700" : "text-stone-700"}`}>
                      Withdrawal
                    </p>
                    <p className="text-xs text-stone-400">Take out money</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                Amount (UGX) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 text-sm font-medium">
                  UGX
                </span>
                <input
                  type="number"
                  required
                  min="1"
                  step="1"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-14 pr-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                />
              </div>
              {txnType === "withdrawal" && amount && parseFloat(amount) > foundMember.currentBalance && (
                <p className="text-xs text-red-500 mt-1">
                  Amount exceeds current balance of {formatUGX(foundMember.currentBalance)}
                </p>
              )}
              {amount && parseFloat(amount) > 0 && (
                <p className="text-xs text-stone-400 mt-1">
                  New balance will be:{" "}
                  <span className="font-semibold text-stone-700">
                    {formatUGX(
                      txnType === "deposit"
                        ? foundMember.currentBalance + parseFloat(amount)
                        : foundMember.currentBalance - parseFloat(amount)
                    )}
                  </span>
                </p>
              )}
            </div>

            {/* Payment method */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                Payment method <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(["cash", "mobile_money", "bank_transfer", "cheque"] as PaymentMethod[]).map((method) => {
                  const labels: Record<PaymentMethod, string> = {
                    cash:          "Cash",
                    mobile_money:  "Mobile Money",
                    bank_transfer: "Bank Transfer",
                    cheque:        "Cheque",
                  }
                  return (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`py-2.5 px-3 rounded-xl border-2 text-xs font-medium transition-all ${
                        paymentMethod === method
                          ? "border-green-600 bg-green-50 text-green-800"
                          : "border-stone-200 text-stone-600 hover:border-stone-300"
                      }`}
                    >
                      {labels[method]}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                Description <span className="text-stone-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Monthly savings contribution"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input-field"
              />
            </div>
          </div>

          {submitError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-red-700 text-sm">{submitError}</p>
            </div>
          )}

          <div className="flex gap-3">
            <Link
              href="/dashboard/transactions"
              className="flex-1 py-3 px-6 rounded-xl font-semibold text-sm border-2 border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors text-center"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting || !amount || parseFloat(amount) <= 0}
              className="flex-1 py-3 px-6 rounded-xl font-semibold text-white text-sm bg-green-700 hover:bg-green-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
              ) : (
                <>{txnType === "deposit" ? "Record Deposit" : "Record Withdrawal"}</>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
