// FILE: src/components/dashboard/FinancialRulesForm.tsx
// ACTION: NEW
//
// Client form to configure the SACCO's financial rules.
// These settings affect loan eligibility and interest calculations.

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, CheckCircle, AlertCircle, Info } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { formatUGX } from "@/lib/utils"

type Settings = {
  id?:                       string
  sacco_id?:                 string
  currency?:                 string
  min_savings_amount?:       number
  min_shares_amount?:        number
  max_loan_multiplier?:      number
  default_interest_rate?:    number
  late_payment_penalty_pct?: number
  loan_processing_fee_pct?:  number
  allow_member_self_register?: boolean
  require_document_upload?:  boolean
} | null

export default function FinancialRulesForm({
  saccoId,
  settings,
}: {
  saccoId:  string
  settings: Settings
}) {
  const router = useRouter()

  const [minSavings, setMinSavings]         = useState(String(settings?.min_savings_amount ?? 10000))
  const [minShares, setMinShares]           = useState(String(settings?.min_shares_amount ?? 50000))
  const [loanMultiplier, setLoanMultiplier] = useState(String(settings?.max_loan_multiplier ?? 3))
  const [interestRate, setInterestRate]     = useState(String(settings?.default_interest_rate ?? 18))
  const [penalty, setPenalty]               = useState(String(settings?.late_payment_penalty_pct ?? 2))
  const [processingFee, setProcessingFee]   = useState(String(settings?.loan_processing_fee_pct ?? 1))
  const [requireDocs, setRequireDocs]       = useState(settings?.require_document_upload ?? true)

  const [isLoading, setIsLoading]           = useState(false)
  const [error, setError]                   = useState<string | null>(null)
  const [isSuccess, setIsSuccess]           = useState(false)

  // Example calculation
  const exampleSavings  = 500000
  const exampleMaxLoan  = exampleSavings * parseFloat(loanMultiplier || "3")
  const exampleMonthly  = exampleMaxLoan * (parseFloat(interestRate || "18") / 100 / 12)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setIsSuccess(false)

    const supabase = createClient()

    const payload = {
      sacco_id:                 saccoId,
      min_savings_amount:       parseFloat(minSavings) || 10000,
      min_shares_amount:        parseFloat(minShares) || 50000,
      max_loan_multiplier:      parseFloat(loanMultiplier) || 3,
      default_interest_rate:    parseFloat(interestRate) || 18,
      late_payment_penalty_pct: parseFloat(penalty) || 2,
      loan_processing_fee_pct:  parseFloat(processingFee) || 1,
      require_document_upload:  requireDocs,
    }

    // Upsert — create if doesn't exist, update if it does
    const { error: err } = await supabase
      .from("sacco_settings")
      .upsert(payload, { onConflict: "sacco_id" })

    if (err) {
      setError(err.message)
      setIsLoading(false)
      return
    }

    setIsLoading(false)
    setIsSuccess(true)
    setTimeout(() => setIsSuccess(false), 3000)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {isSuccess && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
          <p className="text-green-700 text-sm font-medium">Financial rules updated!</p>
        </div>
      )}

      {/* Savings rules */}
      <div>
        <h4 className="text-sm font-semibold text-stone-700 mb-3">Savings Requirements</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-stone-500 mb-1.5">
              Minimum monthly savings (UGX)
            </label>
            <input type="number" min="0" step="1000"
              value={minSavings} onChange={(e) => setMinSavings(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-green-600" />
            <p className="text-xs text-stone-400 mt-1">Currently: {formatUGX(parseFloat(minSavings) || 0)}</p>
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1.5">
              Minimum share capital (UGX)
            </label>
            <input type="number" min="0" step="1000"
              value={minShares} onChange={(e) => setMinShares(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-green-600" />
            <p className="text-xs text-stone-400 mt-1">Currently: {formatUGX(parseFloat(minShares) || 0)}</p>
          </div>
        </div>
      </div>

      {/* Loan rules */}
      <div>
        <h4 className="text-sm font-semibold text-stone-700 mb-3">Loan Rules</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-stone-500 mb-1.5">
              Maximum loan multiplier
            </label>
            <div className="relative">
              <input type="number" min="1" max="10" step="0.5"
                value={loanMultiplier} onChange={(e) => setLoanMultiplier(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-green-600 pr-10" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 text-xs font-medium">x</span>
            </div>
            <p className="text-xs text-stone-400 mt-1">
              Max loan = {loanMultiplier}x member&apos;s savings
            </p>
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1.5">
              Default interest rate (% per year)
            </label>
            <div className="relative">
              <input type="number" min="0" max="100" step="0.5"
                value={interestRate} onChange={(e) => setInterestRate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-green-600 pr-8" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 text-xs font-medium">%</span>
            </div>
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1.5">
              Late payment penalty (% per month)
            </label>
            <div className="relative">
              <input type="number" min="0" max="20" step="0.5"
                value={penalty} onChange={(e) => setPenalty(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-green-600 pr-8" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 text-xs font-medium">%</span>
            </div>
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1.5">
              Loan processing fee (%)
            </label>
            <div className="relative">
              <input type="number" min="0" max="10" step="0.5"
                value={processingFee} onChange={(e) => setProcessingFee(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-green-600 pr-8" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 text-xs font-medium">%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Live example */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Info className="w-4 h-4 text-blue-500" />
          <p className="text-xs font-semibold text-blue-700">Example with current settings</p>
        </div>
        <p className="text-xs text-blue-600">
          A member with {formatUGX(exampleSavings)} in savings can borrow up to{" "}
          <strong>{formatUGX(exampleMaxLoan)}</strong> at{" "}
          <strong>{interestRate}% p.a.</strong> — monthly interest:{" "}
          <strong>{formatUGX(Math.round(exampleMonthly))}</strong>
        </p>
      </div>

      {/* Feature toggles */}
      <div>
        <h4 className="text-sm font-semibold text-stone-700 mb-3">Features</h4>
        <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-stone-200 hover:bg-stone-50 transition-colors">
          <div className="relative">
            <input
              type="checkbox"
              checked={requireDocs}
              onChange={(e) => setRequireDocs(e.target.checked)}
              className="sr-only"
            />
            <div className={`w-10 h-6 rounded-full transition-colors ${requireDocs ? "bg-green-600" : "bg-stone-300"}`}>
              <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform mt-1 ${requireDocs ? "translate-x-5 ml-1" : "translate-x-1"}`} />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-stone-800">Require document upload</p>
            <p className="text-xs text-stone-400">Members must upload receipts for transactions</p>
          </div>
        </label>
      </div>

      <div className="pt-2">
        <button type="submit" disabled={isLoading}
          className="px-6 py-2.5 bg-green-700 hover:bg-green-800 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2">
          {isLoading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
            : "Save Financial Rules"
          }
        </button>
      </div>
    </form>
  )
}
