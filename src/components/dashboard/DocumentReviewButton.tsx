// FILE: src/components/dashboard/DocumentReviewButton.tsx
// ACTION: NEW
//
// Client component for admin to review documents.
// Shows Approve and Reject buttons with optional review notes.

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle, XCircle, Loader2, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function DocumentReviewButton({
  documentId,
  currentStatus,
}: {
  documentId:    string
  currentStatus: string
}) {
  const router = useRouter()
  const [isLoading, setIsLoading]   = useState(false)
  const [showModal, setShowModal]   = useState(false)
  const [action, setAction]         = useState<"approved" | "rejected" | null>(null)
  const [reviewNotes, setReviewNotes] = useState("")
  const [error, setError]           = useState<string | null>(null)

  function openModal(a: "approved" | "rejected") {
    setAction(a)
    setShowModal(true)
    setReviewNotes("")
    setError(null)
  }

  async function handleSubmit() {
    if (!action) return
    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    const { error: err } = await supabase
      .from("documents")
      .update({
        status:       action,
        reviewed_at:  new Date().toISOString(),
        review_notes: reviewNotes.trim() || null,
      })
      .eq("id", documentId)

    if (err) {
      setError(err.message)
      setIsLoading(false)
      return
    }

    setIsLoading(false)
    setShowModal(false)
    router.refresh()
  }

  return (
    <>
      <div className="flex gap-1.5">
        <button
          onClick={() => openModal("approved")}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-semibold rounded-lg border border-green-200 transition-colors"
        >
          <CheckCircle className="w-3.5 h-3.5" /> Approve
        </button>
        <button
          onClick={() => openModal("rejected")}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold rounded-lg border border-red-200 transition-colors"
        >
          <XCircle className="w-3.5 h-3.5" /> Reject
        </button>
      </div>

      {/* Review modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">

            <div className="flex items-center justify-between p-5 border-b border-stone-100">
              <h3 className="font-bold text-stone-900"
                  style={{ fontFamily: "var(--font-heading, serif)" }}>
                {action === "approved" ? "Approve Document" : "Reject Document"}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-stone-400 hover:text-stone-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-sm text-stone-500">
                {action === "approved"
                  ? "This document will be marked as approved and the member will be notified."
                  : "This document will be rejected. Please add a note explaining why."
                }
              </p>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 p-3 rounded-xl">{error}</p>
              )}

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  Review notes{" "}
                  <span className="text-stone-400 font-normal">
                    {action === "rejected" ? "(recommended)" : "(optional)"}
                  </span>
                </label>
                <textarea
                  rows={3}
                  placeholder={
                    action === "approved"
                      ? "e.g. Receipt verified and matches transaction record."
                      : "e.g. Document is blurry, please re-upload a clearer copy."
                  }
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 resize-none"
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className={`w-full py-3 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
                  action === "approved"
                    ? "bg-green-700 hover:bg-green-800"
                    : "bg-red-500 hover:bg-red-600"
                }`}
              >
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                ) : (
                  action === "approved" ? "Confirm Approval" : "Confirm Rejection"
                )}
              </button>

              <button
                onClick={() => setShowModal(false)}
                disabled={isLoading}
                className="w-full py-2.5 border border-stone-200 text-stone-500 text-sm font-medium rounded-xl hover:bg-stone-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
