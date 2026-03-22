// FILE: src/components/dashboard/PaymentMethodsList.tsx
// ACTION: NEW
//
// Shows payment methods.
// Admin: can add, edit, toggle active/inactive each method.
// Member: sees instructions for each active payment channel.

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Plus, Smartphone, Building2, Banknote,
  FileText, Pencil, Trash2, Loader2,
  CheckCircle, X, ToggleLeft, ToggleRight
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"

type PaymentMethodType = "mobile_money" | "bank_transfer" | "cash" | "cheque"

type PaymentMethod = {
  id:             string
  method_type:    PaymentMethodType
  label:          string
  instructions:   string | null
  account_name:   string | null
  account_number: string | null
  bank_name:      string | null
  is_active:      boolean
  display_order:  number
}

const METHOD_ICONS: Record<PaymentMethodType, any> = {
  mobile_money:  Smartphone,
  bank_transfer: Building2,
  cash:          Banknote,
  cheque:        FileText,
}

const METHOD_LABELS: Record<PaymentMethodType, string> = {
  mobile_money:  "Mobile Money",
  bank_transfer: "Bank Transfer",
  cash:          "Cash",
  cheque:        "Cheque",
}

const METHOD_COLORS: Record<PaymentMethodType, string> = {
  mobile_money:  "bg-yellow-50 text-yellow-700",
  bank_transfer: "bg-blue-50 text-blue-700",
  cash:          "bg-green-50 text-green-700",
  cheque:        "bg-purple-50 text-purple-700",
}

export default function PaymentMethodsList({
  methods,
  saccoId,
  isAdmin,
}: {
  methods:  PaymentMethod[]
  saccoId:  string
  isAdmin:  boolean
}) {
  const router = useRouter()
  const [showForm, setShowForm]         = useState(false)
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null)
  const [isLoading, setIsLoading]       = useState(false)
  const [deletingId, setDeletingId]     = useState<string | null>(null)

  // Form state
  const [methodType, setMethodType]   = useState<PaymentMethodType>("mobile_money")
  const [label, setLabel]             = useState("")
  const [instructions, setInstructions] = useState("")
  const [accountName, setAccountName] = useState("")
  const [accountNumber, setAccountNumber] = useState("")
  const [bankName, setBankName]       = useState("")

  function openAddForm() {
    setEditingMethod(null)
    setMethodType("mobile_money")
    setLabel(""); setInstructions(""); setAccountName("")
    setAccountNumber(""); setBankName("")
    setShowForm(true)
  }

  function openEditForm(m: PaymentMethod) {
    setEditingMethod(m)
    setMethodType(m.method_type)
    setLabel(m.label)
    setInstructions(m.instructions ?? "")
    setAccountName(m.account_name ?? "")
    setAccountNumber(m.account_number ?? "")
    setBankName(m.bank_name ?? "")
    setShowForm(true)
  }

  async function handleSave() {
    if (!label.trim()) return
    setIsLoading(true)

    const supabase = createClient()

    const payload = {
      sacco_id:       saccoId,
      method_type:    methodType,
      label:          label.trim(),
      instructions:   instructions.trim() || null,
      account_name:   accountName.trim() || null,
      account_number: accountNumber.trim() || null,
      bank_name:      bankName.trim() || null,
      is_active:      true,
      display_order:  methods.length + 1,
    }

    if (editingMethod) {
      await supabase.from("payment_methods").update(payload).eq("id", editingMethod.id)
    } else {
      await supabase.from("payment_methods").insert(payload)
    }

    setIsLoading(false)
    setShowForm(false)
    router.refresh()
  }

  async function handleToggleActive(method: PaymentMethod) {
    const supabase = createClient()
    await supabase
      .from("payment_methods")
      .update({ is_active: !method.is_active })
      .eq("id", method.id)
    router.refresh()
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    const supabase = createClient()
    await supabase.from("payment_methods").delete().eq("id", id)
    setDeletingId(null)
    router.refresh()
  }

  const activeMethods = methods.filter((m) => m.is_active)
  const displayMethods = isAdmin ? methods : activeMethods

  return (
    <div className="space-y-4">

      {/* Admin: Add button */}
      {isAdmin && (
        <button
          onClick={openAddForm}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-700 hover:bg-green-800 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Payment Method
        </button>
      )}

      {/* Payment methods */}
      {displayMethods.length === 0 && isAdmin && (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm py-12 text-center">
          <Banknote className="w-8 h-8 text-stone-300 mx-auto mb-3" />
          <p className="text-stone-500 text-sm font-medium mb-1">No payment methods yet</p>
          <p className="text-stone-400 text-xs">Add MTN Mobile Money, Airtel Money, bank details, or cash instructions.</p>
        </div>
      )}

      <div className="space-y-3">
        {displayMethods.map((method) => {
          const Icon = METHOD_ICONS[method.method_type] ?? Banknote
          const colorClass = METHOD_COLORS[method.method_type]

          return (
            <div
              key={method.id}
              className={`bg-white rounded-2xl border shadow-sm p-5 transition-all ${
                !method.is_active && isAdmin ? "opacity-60 border-stone-100" : "border-stone-100"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                  <Icon className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-stone-900">{method.label}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colorClass}`}>
                        {METHOD_LABELS[method.method_type]}
                      </span>
                    </div>

                    {/* Admin controls */}
                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleToggleActive(method)}
                          className="p-1.5 text-stone-400 hover:text-stone-600 transition-colors"
                          title={method.is_active ? "Deactivate" : "Activate"}
                        >
                          {method.is_active
                            ? <ToggleRight className="w-5 h-5 text-green-600" />
                            : <ToggleLeft className="w-5 h-5" />
                          }
                        </button>
                        <button
                          onClick={() => openEditForm(method)}
                          className="p-1.5 text-stone-400 hover:text-stone-600 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(method.id)}
                          disabled={deletingId === method.id}
                          className="p-1.5 text-stone-400 hover:text-red-500 transition-colors"
                        >
                          {deletingId === method.id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Trash2 className="w-4 h-4" />
                          }
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Account details */}
                  {(method.account_name || method.account_number || method.bank_name) && (
                    <div className="mt-2 space-y-0.5">
                      {method.bank_name && (
                        <p className="text-xs text-stone-600">
                          <span className="text-stone-400">Bank:</span> {method.bank_name}
                        </p>
                      )}
                      {method.account_name && (
                        <p className="text-xs text-stone-600">
                          <span className="text-stone-400">Name:</span> {method.account_name}
                        </p>
                      )}
                      {method.account_number && (
                        <p className="text-xs font-mono font-semibold text-stone-800 text-base">
                          {method.account_number}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Instructions */}
                  {method.instructions && (
                    <div className="mt-3 p-3 bg-stone-50 rounded-xl">
                      <p className="text-xs text-stone-600 leading-relaxed">{method.instructions}</p>
                    </div>
                  )}

                  {isAdmin && !method.is_active && (
                    <p className="text-xs text-stone-400 mt-2">Hidden from members</p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Add/Edit modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">

            <div className="flex items-center justify-between p-5 border-b border-stone-100">
              <h3 className="font-bold text-stone-900"
                  style={{ fontFamily: "var(--font-heading, serif)" }}>
                {editingMethod ? "Edit Payment Method" : "Add Payment Method"}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["mobile_money", "bank_transfer", "cash", "cheque"] as PaymentMethodType[]).map((t) => {
                    const Icon = METHOD_ICONS[t]
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setMethodType(t)}
                        className={`flex items-center gap-2 p-3 rounded-xl border-2 text-xs font-medium transition-all ${
                          methodType === t
                            ? "border-green-600 bg-green-50 text-green-800"
                            : "border-stone-200 text-stone-600 hover:border-stone-300"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {METHOD_LABELS[t]}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Label */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  Display label <span className="text-red-500">*</span>
                </label>
                <input type="text"
                  placeholder={
                    methodType === "mobile_money" ? "e.g. MTN Mobile Money" :
                    methodType === "bank_transfer" ? "e.g. Centenary Bank" :
                    methodType === "cash" ? "e.g. Cash at Office" : "e.g. Cheque Payment"
                  }
                  value={label} onChange={(e) => setLabel(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />
              </div>

              {/* Account fields */}
              {methodType !== "cash" && (
                <>
                  {methodType === "bank_transfer" && (
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1.5">Bank name</label>
                      <input type="text" placeholder="e.g. Centenary Bank"
                        value={bankName} onChange={(e) => setBankName(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1.5">Account name</label>
                    <input type="text" placeholder="e.g. Kampala Teachers SACCO"
                      value={accountName} onChange={(e) => setAccountName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1.5">
                      {methodType === "mobile_money" ? "Phone number" : "Account number"}
                    </label>
                    <input type="text"
                      placeholder={methodType === "mobile_money" ? "e.g. 0774123456" : "e.g. 3100012345"}
                      value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-600" />
                  </div>
                </>
              )}

              {/* Instructions */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  Instructions for members
                </label>
                <textarea rows={3}
                  placeholder={
                    methodType === "mobile_money"
                      ? "e.g. Dial *165# → Send Money → Enter the number above → Enter amount → Confirm payment."
                      : methodType === "cash"
                      ? "e.g. Visit our office at Plot 14 Kampala Road between 8am-5pm Monday to Friday."
                      : "e.g. Transfer to the account above and send a screenshot to your loan officer."
                  }
                  value={instructions} onChange={(e) => setInstructions(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 resize-none" />
              </div>

              <button
                onClick={handleSave}
                disabled={isLoading || !label.trim()}
                className="w-full py-3 bg-green-700 hover:bg-green-800 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                  : editingMethod ? "Save Changes" : "Add Payment Method"
                }
              </button>

              <button onClick={() => setShowForm(false)}
                className="w-full py-2.5 border border-stone-200 text-stone-500 text-sm font-medium rounded-xl hover:bg-stone-50 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
