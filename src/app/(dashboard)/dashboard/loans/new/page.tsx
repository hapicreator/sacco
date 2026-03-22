// FILE: src/app/(dashboard)/dashboard/loans/new/page.tsx
// ACTION: NEW
//
// Loan application form — Members only.
// Member fills in amount, purpose, duration.
// The system calculates monthly repayment and total repayable.
// Admin reviews and approves from the loan detail page.

"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, CreditCard, AlertCircle,
  CheckCircle, Loader2, Info
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { formatUGX } from "@/lib/utils"

export default function NewLoanPage() {
  const router = useRouter()
  const [isLoading, setIsLoading]       = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [isSuccess, setIsSuccess]       = useState(false)

  // SACCO settings
  const [maxLoanMultiplier, setMaxLoanMultiplier] = useState(3)
  const [defaultInterestRate, setDefaultInterestRate] = useState(18)
  const [memberSavings, setMemberSavings] = useState(0)
  const [isLoadingSettings, setIsLoadingSettings] = useState(true)

  // Form fields
  const [amount, setAmount]         = useState("")
  const [duration, setDuration]     = useState("12")
  const [purpose, setPurpose]       = useState("")
  const [notes, setNotes]           = useState("")

  // Calculated fields
  const amountNum   = parseFloat(amount) || 0
  const durationNum = parseInt(duration) || 12
  const monthlyRate = defaultInterestRate / 100 / 12
  const monthlyPayment = amountNum > 0 && monthlyRate > 0
    ? (amountNum * monthlyRate * Math.pow(1 + monthlyRate, durationNum)) /
      (Math.pow(1 + monthlyRate, durationNum) - 1)
    : 0
  const totalRepayable  = monthlyPayment * durationNum
  const totalInterest   = totalRepayable - amountNum
  const maxLoanAmount   = memberSavings * maxLoanMultiplier

  // Load SACCO settings and member savings
  useEffect(() => {
    async function loadData() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: saccoUser } = await supabase
        .from("sacco_users")
        .select("sacco_id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single()

      if (!saccoUser) return

      // Load settings
      const { data: settings } = await supabase
        .from("sacco_settings")
        .select("max_loan_multiplier, default_interest_rate")
        .eq("sacco_id", saccoUser.sacco_id)
        .single()

      if (settings) {
        setMaxLoanMultiplier(settings.max_loan_multiplier ?? 3)
        setDefaultInterestRate(settings.default_interest_rate ?? 18)
      }

      // Load member savings balance
      const { data: member } = await supabase
        .from("members")
        .select("id")
        .eq("user_id", user.id)
        .eq("sacco_id", saccoUser.sacco_id)
        .single()

      if (member) {
        const { data: accounts } = await supabase
          .from("accounts")
          .select("balance")
          .eq("member_id", member.id)
          .eq("account_type", "savings")
          .eq("is_active", true)

        const total = accounts?.reduce((sum, a) => sum + (a.balance ?? 0), 0) ?? 0
        setMemberSavings(total)
      }

      setIsLoadingSettings(false)
    }

    loadData()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (amountNum <= 0) { setError("Please enter a valid loan amount."); return }
    if (amountNum > maxLoanAmount && maxLoanAmount > 0) {
      setError(`Maximum loan amount is ${formatUGX(maxLoanAmount)} (${maxLoanMultiplier}x your savings of ${formatUGX(memberSavings)}).`)
      return
    }
    if (!purpose.trim()) { setError("Please describe the purpose of this loan."); return }

    setIsLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError("You must be logged in."); setIsLoading(false); return }

    const { data: saccoUser } = await supabase
      .from("sacco_users")
      .select("sacco_id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single()

    if (!saccoUser) { setError("Could not find your SACCO."); setIsLoading(false); return }

    const { data: member } = await supabase
      .from("members")
      .select("id")
      .eq("user_id", user.id)
      .eq("sacco_id", saccoUser.sacco_id)
      .single()

    if (!member) { setError("Member record not found."); setIsLoading(false); return }

    // Check for existing active loan
    const { count: activeLoans } = await supabase
      .from("loans")
      .select("id", { count: "exact", head: true })
      .eq("member_id", member.id)
      .in("status", ["pending", "approved", "disbursed", "active"])

    if (activeLoans && activeLoans > 0) {
      setError("You already have an active or pending loan. Please repay it before applying for another.")
      setIsLoading(false)
      return
    }

    // Submit loan application
    const { error: loanError } = await supabase
      .from("loans")
      .insert({
        sacco_id:          saccoUser.sacco_id,
        member_id:         member.id,
        amount_applied:    amountNum,
        interest_rate:     defaultInterestRate,
        duration_months:   durationNum,
        monthly_repayment: Math.round(monthlyPayment),
        total_repayable:   Math.round(totalRepayable),
        outstanding_balance: 0,
        amount_repaid:     0,
        purpose:           purpose.trim(),
        notes:             notes.trim() || null,
        status:            "pending",
      })

    if (loanError) {
      setError(loanError.message)
      setIsLoading(false)
      return
    }

    // Notify admins
    const { data: admins } = await supabase
      .from("sacco_users")
      .select("user_id")
      .eq("sacco_id", saccoUser.sacco_id)
      .in("role", ["sacco_admin", "staff"])
      .eq("is_active", true)

    if (admins) {
      await Promise.all(admins.map((admin) =>
        supabase.from("notifications").insert({
          sacco_id:          saccoUser.sacco_id,
          recipient_user_id: admin.user_id,
          type:              "general",
          title:             "New Loan Application",
          message:           `A member has applied for a loan of ${formatUGX(amountNum)}. Please review.`,
        })
      ))
    }

    setIsLoading(false)
    setIsSuccess(true)
  }

  if (isSuccess) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-10 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-stone-900 mb-2"
              style={{ fontFamily: "var(--font-heading, serif)" }}>
            Application Submitted!
          </h2>
          <p className="text-stone-500 text-sm mb-2">
            Your loan application for <span className="font-bold text-stone-800">{formatUGX(amountNum)}</span> has been submitted.
          </p>
          <p className="text-stone-400 text-xs mb-8">
            Your SACCO administrator will review and approve your application. You will be notified once a decision is made.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/dashboard/loans"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-green-700 hover:bg-green-800 text-white text-sm font-semibold rounded-xl transition-colors">
              View My Loans
            </Link>
            <Link href="/dashboard"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border-2 border-stone-200 text-stone-600 hover:bg-stone-50 text-sm font-semibold rounded-xl transition-colors">
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20 lg:pb-6">

      <div>
        <Link href="/dashboard/loans"
          className="inline-flex items-center gap-1.5 text-stone-400 hover:text-stone-600 text-sm mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Loans
        </Link>
        <h2 className="text-2xl font-bold text-stone-900"
            style={{ fontFamily: "var(--font-heading, serif)" }}>
          Apply for a Loan
        </h2>
        <p className="text-sm text-stone-500 mt-0.5">
          Fill in your loan details. Your SACCO admin will review and respond.
        </p>
      </div>

      {/* Eligibility info */}
      {!isLoadingSettings && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-1 text-sm">
              <p className="font-semibold text-blue-800">Your Loan Eligibility</p>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-blue-700 text-xs">
                <span>Your savings: <strong>{formatUGX(memberSavings)}</strong></span>
                <span>Max loan multiplier: <strong>{maxLoanMultiplier}x</strong></span>
                <span>Max loan amount: <strong>{formatUGX(maxLoanAmount)}</strong></span>
                <span>Interest rate: <strong>{defaultInterestRate}% p.a.</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Loan details */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 space-y-4">
          <h3 className="font-semibold text-stone-900"
              style={{ fontFamily: "var(--font-heading, serif)" }}>
            Loan Details
          </h3>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Loan amount (UGX) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 text-sm font-medium">UGX</span>
              <input
                type="number" required min="1" step="1000"
                placeholder="0"
                value={amount} onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-14 pr-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
              />
            </div>
            {maxLoanAmount > 0 && amountNum > maxLoanAmount && (
              <p className="text-xs text-red-500 mt-1">
                Exceeds maximum loan amount of {formatUGX(maxLoanAmount)}
              </p>
            )}
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Repayment period <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {["3", "6", "12", "24"].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setDuration(m)}
                  className={`py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                    duration === m
                      ? "border-green-600 bg-green-50 text-green-800"
                      : "border-stone-200 text-stone-600 hover:border-stone-300"
                  }`}
                >
                  {m} months
                </button>
              ))}
            </div>
          </div>

          {/* Purpose */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Purpose of loan <span className="text-red-500">*</span>
            </label>
            <input
              type="text" required
              placeholder="e.g. Business stock, School fees, Medical, Home improvement"
              value={purpose} onChange={(e) => setPurpose(e.target.value)}
              className="input-field"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Additional notes <span className="text-stone-400 font-normal">(optional)</span>
            </label>
            <textarea
              rows={3} placeholder="Any additional information for the loan officer..."
              value={notes} onChange={(e) => setNotes(e.target.value)}
              className="input-field resize-none"
            />
          </div>
        </div>

        {/* Loan calculator */}
        {amountNum > 0 && (
          <div className="bg-stone-50 rounded-2xl border border-stone-200 p-5">
            <h3 className="font-semibold text-stone-700 text-sm mb-4">Loan Summary</h3>
            <div className="space-y-2">
              {[
                { label: "Loan Amount",       value: formatUGX(amountNum),                    bold: false },
                { label: "Interest Rate",     value: `${defaultInterestRate}% per year`,       bold: false },
                { label: "Repayment Period",  value: `${durationNum} months`,                  bold: false },
                { label: "Monthly Payment",   value: formatUGX(Math.round(monthlyPayment)),    bold: true  },
                { label: "Total Interest",    value: formatUGX(Math.round(totalInterest)),     bold: false },
                { label: "Total Repayable",   value: formatUGX(Math.round(totalRepayable)),   bold: true  },
              ].map((row) => (
                <div key={row.label} className="flex justify-between items-center">
                  <span className="text-sm text-stone-500">{row.label}</span>
                  <span className={`text-sm ${row.bold ? "font-bold text-stone-900" : "text-stone-700"}`}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-stone-200">
              <p className="text-xs text-stone-400">
                These are estimated values. Actual amounts may vary based on admin approval.
              </p>
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-3">
          <Link href="/dashboard/loans"
            className="flex-1 py-3 px-6 rounded-xl font-semibold text-sm border-2 border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors text-center">
            Cancel
          </Link>
          <button
            type="submit" disabled={isLoading || isLoadingSettings}
            className="flex-1 py-3 px-6 rounded-xl font-semibold text-white text-sm bg-green-700 hover:bg-green-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
              : <><CreditCard className="w-4 h-4" /> Submit Application</>
            }
          </button>
        </div>
      </form>
    </div>
  )
}
