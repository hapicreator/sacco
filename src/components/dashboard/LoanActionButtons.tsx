// FILE: src/components/dashboard/LoanActionButtons.tsx
// ACTION: NEW
//
// Client component for loan management actions (admin only).
// Handles: Approve, Reject, Disburse, Record Repayment.
// Each action shows a confirmation modal before proceeding.

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  CheckCircle, XCircle, ArrowDownRight,
  PiggyBank, Loader2, AlertCircle, X
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { formatUGX } from "@/lib/utils"

type Action = "approve" | "reject" | "disburse" | "repayment" | null

type Props = {
  loanId:             string
  status:             string
  memberId:           string
  saccoId:            string
  amountApplied:      number
  interestRate:       number
  durationMonths:     number
  monthlyRepayment:   number
  totalRepayable:     number
  outstandingBalance: number
  memberUserId:       string
}

export default function LoanActionButtons(props: Props) {
  const router = useRouter()
  const [activeAction, setActiveAction] = useState<Action>(null)
  const [isLoading, setIsLoading]       = useState(false)
  const [error, setError]               = useState<string | null>(null)

  // Form state for modals
  const [approvedAmount, setApprovedAmount] = useState(props.amountApplied.toString())
  const [rejectReason, setRejectReason]     = useState("")
  const [repaymentAmount, setRepaymentAmount] = useState(props.monthlyRepayment.toString())
  const [repaymentNotes, setRepaymentNotes] = useState("")

  function closeModal() {
    setActiveAction(null)
    setError(null)
    setRejectReason("")
  }

  // ── Approve loan ──────────────────────────────────────────────────────────
  async function handleApprove() {
    const approved = parseFloat(approvedAmount)
    if (isNaN(approved) || approved <= 0) {
      setError("Please enter a valid approved amount.")
      return
    }
    setIsLoading(true)
    setError(null)

    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    // Calculate due date
    const dueDate = new Date()
    dueDate.setMonth(dueDate.getMonth() + props.durationMonths)

    const { error: err } = await supabase
      .from("loans")
      .update({
        status:           "approved",
        amount_approved:  approved,
        outstanding_balance: approved,
        approved_at:      new Date().toISOString(),
        approved_by:      session.user.id,
        due_date:         dueDate.toISOString(),
      })
      .eq("id", props.loanId)

    if (err) { setError(err.message); setIsLoading(false); return }

    // Notify member
    await supabase.from("notifications").insert({
      sacco_id:          props.saccoId,
      recipient_user_id: props.memberUserId,
      type:              "loan_approved",
      title:             "Loan Approved!",
      message:           `Your loan application of ${formatUGX(approved)} has been approved. It will be disbursed soon.`,
    })

    setIsLoading(false)
    closeModal()
    router.refresh()
  }

  // ── Reject loan ────────────────────────────────────────────────────────────
  async function handleReject() {
    setIsLoading(true)
    setError(null)

    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { error: err } = await supabase
      .from("loans")
      .update({
        status:      "rejected",
        approved_at: new Date().toISOString(),
        notes:       rejectReason || null,
      })
      .eq("id", props.loanId)

    if (err) { setError(err.message); setIsLoading(false); return }

    await supabase.from("notifications").insert({
      sacco_id:          props.saccoId,
      recipient_user_id: props.memberUserId,
      type:              "loan_rejected",
      title:             "Loan Application Update",
      message:           `Your loan application has not been approved at this time${rejectReason ? `: ${rejectReason}` : "."}.`,
    })

    setIsLoading(false)
    closeModal()
    router.refresh()
  }

  // ── Disburse loan ──────────────────────────────────────────────────────────
  async function handleDisburse() {
    setIsLoading(true)
    setError(null)

    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    // Find the member's savings account to record disbursement
    const { data: account } = await supabase
      .from("accounts")
      .select("id, balance")
      .eq("member_id", props.memberId)
      .eq("sacco_id", props.saccoId)
      .eq("account_type", "savings")
      .single()

    const amountApproved = props.amountApplied // use amount_approved from loan

    // Get actual approved amount
    const { data: loanData } = await supabase
      .from("loans")
      .select("amount_approved, total_repayable, monthly_repayment")
      .eq("id", props.loanId)
      .single()

    const disbursedAmount = loanData?.amount_approved ?? amountApproved

    // Update loan status
    const { error: loanErr } = await supabase
      .from("loans")
      .update({
        status:       "active",
        disbursed_at: new Date().toISOString(),
        disbursed_by: session.user.id,
        outstanding_balance: disbursedAmount,
      })
      .eq("id", props.loanId)

    if (loanErr) { setError(loanErr.message); setIsLoading(false); return }

    // Record disbursement transaction in the member's savings account
    if (account) {
      const newBalance = account.balance + disbursedAmount
      await supabase.from("transactions").insert({
        sacco_id:         props.saccoId,
        account_id:       account.id,
        transaction_type: "loan_disbursement",
        amount:           disbursedAmount,
        balance_before:   account.balance,
        balance_after:    newBalance,
        status:           "completed",
        reference_no:     `DISB-${Date.now()}`,
        description:      "Loan disbursement",
        performed_by:     session.user.id,
        loan_id:          props.loanId,
      })

      await supabase.from("accounts").update({ balance: newBalance }).eq("id", account.id)
    }

    await supabase.from("notifications").insert({
      sacco_id:          props.saccoId,
      recipient_user_id: props.memberUserId,
      type:              "deposit_received",
      title:             "Loan Disbursed",
      message:           `${formatUGX(disbursedAmount)} has been disbursed to your account. Your first repayment is due next month.`,
    })

    setIsLoading(false)
    closeModal()
    router.refresh()
  }

  // ── Record repayment ───────────────────────────────────────────────────────
  async function handleRepayment() {
    const amount = parseFloat(repaymentAmount)
    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid repayment amount.")
      return
    }
    if (amount > props.outstandingBalance) {
      setError(`Amount exceeds outstanding balance of ${formatUGX(props.outstandingBalance)}.`)
      return
    }

    setIsLoading(true)
    setError(null)

    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    // Calculate principal vs interest split
    const interestPaid   = Math.min(amount * (props.interestRate / 100 / 12), amount * 0.4)
    const principalPaid  = amount - interestPaid
    const balanceAfter   = Math.max(props.outstandingBalance - amount, 0)

    // Get member's savings account for the transaction record
    const { data: account } = await supabase
      .from("accounts")
      .select("id, balance")
      .eq("member_id", props.memberId)
      .eq("sacco_id", props.saccoId)
      .eq("account_type", "savings")
      .single()

    // Record transaction
    let txnId: string | null = null
    if (account) {
      const newBalance = Math.max(account.balance - amount, 0)
      const { data: txn } = await supabase
        .from("transactions")
        .insert({
          sacco_id:         props.saccoId,
          account_id:       account.id,
          transaction_type: "loan_repayment",
          amount:           amount,
          balance_before:   account.balance,
          balance_after:    newBalance,
          status:           "completed",
          reference_no:     `REP-${Date.now()}`,
          description:      repaymentNotes || "Loan repayment",
          performed_by:     session.user.id,
          loan_id:          props.loanId,
        })
        .select("id")
        .single()

      txnId = txn?.id ?? null
      await supabase.from("accounts").update({ balance: newBalance }).eq("id", account.id)
    }

    // Record repayment
    await supabase.from("loan_repayments").insert({
      sacco_id:       props.saccoId,
      loan_id:        props.loanId,
      transaction_id: txnId,
      amount_paid:    amount,
      principal_paid: principalPaid,
      interest_paid:  interestPaid,
      balance_after:  balanceAfter,
      payment_date:   new Date().toISOString(),
      received_by:    session.user.id,
      notes:          repaymentNotes || null,
    })

    // Get current loan data
    const { data: currentLoan } = await supabase
      .from("loans")
      .select("amount_repaid")
      .eq("id", props.loanId)
      .single()

    const newAmountRepaid = (currentLoan?.amount_repaid ?? 0) + amount
    const isCompleted = balanceAfter <= 0

    // Update loan
    await supabase
      .from("loans")
      .update({
        amount_repaid:       newAmountRepaid,
        outstanding_balance: balanceAfter,
        status:              isCompleted ? "completed" : "active",
      })
      .eq("id", props.loanId)

    // Notify member
    await supabase.from("notifications").insert({
      sacco_id:          props.saccoId,
      recipient_user_id: props.memberUserId,
      type:              "withdrawal_processed",
      title:             isCompleted ? "Loan Fully Repaid!" : "Loan Repayment Received",
      message:           isCompleted
        ? `Congratulations! You have fully repaid your loan of ${formatUGX(amount)}. Your loan account is now closed.`
        : `Repayment of ${formatUGX(amount)} received. Outstanding balance: ${formatUGX(balanceAfter)}.`,
    })

    setIsLoading(false)
    closeModal()
    router.refresh()
  }

  // ── Render action buttons based on status ─────────────────────────────────
  const renderButtons = () => {
    switch (props.status) {
      case "pending":
        return (
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setActiveAction("approve")}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-green-700 hover:bg-green-800 text-white text-xs font-semibold rounded-xl transition-colors">
              <CheckCircle className="w-3.5 h-3.5" /> Approve
            </button>
            <button onClick={() => setActiveAction("reject")}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold rounded-xl border border-red-200 transition-colors">
              <XCircle className="w-3.5 h-3.5" /> Reject
            </button>
          </div>
        )
      case "approved":
        return (
          <button onClick={() => setActiveAction("disburse")}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl transition-colors">
            <ArrowDownRight className="w-3.5 h-3.5" /> Disburse Funds
          </button>
        )
      case "active":
      case "disbursed":
        return (
          <button onClick={() => setActiveAction("repayment")}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-green-700 hover:bg-green-800 text-white text-xs font-semibold rounded-xl transition-colors">
            <PiggyBank className="w-3.5 h-3.5" /> Record Repayment
          </button>
        )
      default:
        return null
    }
  }

  return (
    <>
      {renderButtons()}

      {/* Modal overlay */}
      {activeAction && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">

            {/* Modal header */}
            <div className="flex items-center justify-between p-5 border-b border-stone-100">
              <h3 className="font-bold text-stone-900"
                  style={{ fontFamily: "var(--font-heading, serif)" }}>
                {activeAction === "approve"   && "Approve Loan"}
                {activeAction === "reject"    && "Reject Application"}
                {activeAction === "disburse"  && "Disburse Loan"}
                {activeAction === "repayment" && "Record Repayment"}
              </h3>
              <button onClick={closeModal} className="text-stone-400 hover:text-stone-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              {/* Approve modal */}
              {activeAction === "approve" && (
                <>
                  <p className="text-sm text-stone-500">
                    Confirm the approved amount. You can adjust it from the applied amount of <strong>{formatUGX(props.amountApplied)}</strong>.
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1.5">Approved amount (UGX)</label>
                    <input type="number" min="1"
                      value={approvedAmount} onChange={(e) => setApprovedAmount(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />
                  </div>
                  <button onClick={handleApprove} disabled={isLoading}
                    className="w-full py-3 bg-green-700 hover:bg-green-800 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                    {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Approving...</> : "Confirm Approval"}
                  </button>
                </>
              )}

              {/* Reject modal */}
              {activeAction === "reject" && (
                <>
                  <p className="text-sm text-stone-500">
                    This will reject the loan application and notify the member. Optionally add a reason.
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1.5">Reason (optional)</label>
                    <textarea rows={3}
                      placeholder="e.g. Insufficient savings, already has active loan..."
                      value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none" />
                  </div>
                  <button onClick={handleReject} disabled={isLoading}
                    className="w-full py-3 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                    {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Rejecting...</> : "Confirm Rejection"}
                  </button>
                </>
              )}

              {/* Disburse modal */}
              {activeAction === "disburse" && (
                <>
                  <p className="text-sm text-stone-500">
                    This will mark the loan as active and record a disbursement transaction to the member&apos;s account.
                    The approved amount will be credited to their savings.
                  </p>
                  <div className="bg-stone-50 rounded-xl p-4 text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-stone-500">Amount to disburse</span>
                      <span className="font-bold text-stone-900">{formatUGX(props.amountApplied)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Monthly repayment</span>
                      <span className="font-semibold text-stone-700">{formatUGX(props.monthlyRepayment)}</span>
                    </div>
                  </div>
                  <button onClick={handleDisburse} disabled={isLoading}
                    className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                    {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Disbursing...</> : "Confirm Disbursement"}
                  </button>
                </>
              )}

              {/* Repayment modal */}
              {activeAction === "repayment" && (
                <>
                  <p className="text-sm text-stone-500">
                    Outstanding balance: <strong className="text-orange-600">{formatUGX(props.outstandingBalance)}</strong>
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1.5">Repayment amount (UGX)</label>
                    <input type="number" min="1"
                      value={repaymentAmount} onChange={(e) => setRepaymentAmount(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />
                    {repaymentAmount && parseFloat(repaymentAmount) > 0 && (
                      <p className="text-xs text-stone-400 mt-1">
                        Balance after payment: {formatUGX(Math.max(props.outstandingBalance - parseFloat(repaymentAmount), 0))}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1.5">Notes (optional)</label>
                    <input type="text"
                      placeholder="e.g. Cash payment, MTN Mobile Money"
                      value={repaymentNotes} onChange={(e) => setRepaymentNotes(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />
                  </div>
                  <button onClick={handleRepayment} disabled={isLoading}
                    className="w-full py-3 bg-green-700 hover:bg-green-800 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                    {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Recording...</> : "Record Repayment"}
                  </button>
                </>
              )}

              <button onClick={closeModal} disabled={isLoading}
                className="w-full py-2.5 border border-stone-200 text-stone-500 text-sm font-medium rounded-xl hover:bg-stone-50 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
