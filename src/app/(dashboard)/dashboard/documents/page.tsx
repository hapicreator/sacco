// FILE: src/app/(dashboard)/dashboard/documents/page.tsx
// ACTION: REPLACE
// FIX: getUser() instead of getSession(), defensive null handling

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { FileText, Upload, CheckCircle, Clock, XCircle } from "lucide-react"
import { formatDate } from "@/lib/utils"
import DocumentUploader from "@/components/dashboard/DocumentUploader"
import DocumentReviewButton from "@/components/dashboard/DocumentReviewButton"

export const metadata = { title: "Documents" }

const DOC_TYPE_LABELS: Record<string, string> = {
  receipt:           "Receipt",
  loan_form:         "Loan Form",
  membership_form:   "Membership Form",
  identity_document: "Identity Document",
  other:             "Other",
}

const STATUS_STYLES: Record<string, string> = {
  uploaded:     "bg-amber-50 text-amber-700 border border-amber-200",
  under_review: "bg-blue-50 text-blue-700 border border-blue-200",
  approved:     "bg-green-50 text-green-700 border border-green-200",
  rejected:     "bg-red-50 text-red-600 border border-red-200",
}

const STATUS_ICONS: Record<string, React.ElementType> = {
  uploaded:     Clock,
  under_review: Clock,
  approved:     CheckCircle,
  rejected:     XCircle,
}

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: { status?: string }
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
  const isAdmin      = role === "sacco_admin" || role === "staff"
  const statusFilter = searchParams.status ?? "all"

  // ── Admin view ─────────────────────────────────────────────────────────────
  if (isAdmin) {
    let query = supabase
      .from("documents")
      .select(`
        id,
        document_type,
        status,
        file_name,
        file_url,
        file_size_kb,
        mime_type,
        description,
        review_notes,
        reviewed_at,
        created_at,
        uploader:profiles!uploaded_by(full_name),
        member:members(membership_number, profile:profiles(full_name))
      `)
      .eq("sacco_id", sacco_id)
      .order("created_at", { ascending: false })

    if (statusFilter !== "all") query = query.eq("status", statusFilter)

    const { data: documents, error } = await query
    if (error) console.error("Documents fetch error:", error.message)

    const allDocs     = documents ?? []
    const pending     = allDocs.filter((d) => d.status === "uploaded").length
    const underReview = allDocs.filter((d) => d.status === "under_review").length
    const approved    = allDocs.filter((d) => d.status === "approved").length
    const rejected    = allDocs.filter((d) => d.status === "rejected").length

    return (
      <div className="space-y-6 pb-20 lg:pb-0">

        <div>
          <h2 className="text-2xl font-bold text-stone-900"
              style={{ fontFamily: "var(--font-heading, serif)" }}>Documents</h2>
          <p className="text-sm text-stone-500 mt-0.5">Review member-uploaded receipts and forms</p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Awaiting Review", value: pending + underReview, color: "bg-amber-50", text: "text-amber-700" },
            { label: "Approved",        value: approved,              color: "bg-green-50", text: "text-green-700" },
            { label: "Rejected",        value: rejected,              color: "bg-red-50",   text: "text-red-600"  },
            { label: "Total",           value: allDocs.length,        color: "bg-stone-50", text: "text-stone-700"},
          ].map((card) => (
            <div key={card.label} className={`${card.color} rounded-2xl p-4 border border-stone-100`}>
              <p className={`text-2xl font-bold ${card.text}`}
                 style={{ fontFamily: "var(--font-heading, serif)" }}>
                {card.value}
              </p>
              <p className="text-xs text-stone-500 mt-1">{card.label}</p>
            </div>
          ))}
        </div>

        {(pending + underReview) > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              <span className="font-semibold">{pending + underReview} document{(pending + underReview) > 1 ? "s" : ""}</span>{" "}
              need your review.
            </p>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {[
            { value: "all",          label: "All"          },
            { value: "uploaded",     label: "New"          },
            { value: "under_review", label: "Under Review" },
            { value: "approved",     label: "Approved"     },
            { value: "rejected",     label: "Rejected"     },
          ].map((f) => (
            <a key={f.value} href={`/dashboard/documents?status=${f.value}`}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                statusFilter === f.value
                  ? "bg-green-700 text-white"
                  : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50"
              }`}>
              {f.label}
            </a>
          ))}
        </div>

        {/* Documents list */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          {allDocs.length === 0 ? (
            <div className="py-16 text-center">
              <FileText className="w-8 h-8 text-stone-300 mx-auto mb-3" />
              <p className="text-stone-400 text-sm">No documents found</p>
            </div>
          ) : (
            <div className="divide-y divide-stone-50">
              {allDocs.map((doc) => {
                const member   = doc.member as any
                const profile  = member?.profile as any
                const uploader = doc.uploader as any

                return (
                  <div key={doc.id} className="px-5 py-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-stone-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-stone-900 truncate max-w-xs">
                              {doc.file_name}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-0.5">
                              <span className="text-xs text-stone-400">
                                {DOC_TYPE_LABELS[doc.document_type] ?? doc.document_type}
                              </span>
                              {doc.file_size_kb && (
                                <span className="text-xs text-stone-400">
                                  · {doc.file_size_kb < 1024
                                    ? `${doc.file_size_kb} KB`
                                    : `${(doc.file_size_kb / 1024).toFixed(1)} MB`
                                  }
                                </span>
                              )}
                              <span className="text-xs text-stone-400">· {formatDate(doc.created_at)}</span>
                            </div>
                            <p className="text-xs text-stone-500 mt-1">
                              Uploaded by{" "}
                              <span className="font-medium">
                                {profile?.full_name ?? uploader?.full_name ?? "Unknown"}
                              </span>
                              {member?.membership_number && (
                                <span className="text-stone-400"> ({member.membership_number})</span>
                              )}
                            </p>
                            {doc.description && (
                              <p className="text-xs text-stone-400 mt-1 italic">{doc.description}</p>
                            )}
                            {doc.review_notes && (
                              <p className="text-xs text-stone-500 mt-1 bg-stone-50 px-2 py-1 rounded-lg">
                                Note: {doc.review_notes}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_STYLES[doc.status] ?? ""}`}>
                              {doc.status.replace("_", " ")}
                            </span>
                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-green-700 hover:text-green-800 font-medium underline">
                              View file →
                            </a>
                            {["uploaded", "under_review"].includes(doc.status) && (
                              <DocumentReviewButton documentId={doc.id} currentStatus={doc.status} />
                            )}
                          </div>
                        </div>
                      </div>
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

  // ── Member view ────────────────────────────────────────────────────────────
  const { data: member } = await supabase
    .from("members")
    .select("id, membership_number")
    .eq("user_id", user.id)
    .eq("sacco_id", sacco_id)
    .single()

  const { data: documents } = await supabase
    .from("documents")
    .select("id, document_type, status, file_name, file_url, file_size_kb, description, review_notes, created_at, reviewed_at")
    .eq("sacco_id", sacco_id)
    .eq("uploaded_by", user.id)
    .order("created_at", { ascending: false })

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <div>
        <h2 className="text-2xl font-bold text-stone-900"
            style={{ fontFamily: "var(--font-heading, serif)" }}>My Documents</h2>
        <p className="text-sm text-stone-500 mt-0.5">Upload receipts, forms, and other documents</p>
      </div>

      <DocumentUploader saccoId={sacco_id} memberId={member?.id ?? null} userId={user.id} />

      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100">
          <h3 className="font-semibold text-stone-900"
              style={{ fontFamily: "var(--font-heading, serif)" }}>Uploaded Documents</h3>
        </div>
        {!documents || documents.length === 0 ? (
          <div className="py-12 text-center">
            <Upload className="w-8 h-8 text-stone-300 mx-auto mb-3" />
            <p className="text-stone-400 text-sm">No documents uploaded yet</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-50">
            {documents.map((doc) => (
              <div key={doc.id} className="px-5 py-4 flex items-start gap-4">
                <div className="w-9 h-9 bg-stone-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-stone-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-stone-900 truncate max-w-xs">{doc.file_name}</p>
                      <p className="text-xs text-stone-400 mt-0.5">
                        {DOC_TYPE_LABELS[doc.document_type] ?? doc.document_type} · {formatDate(doc.created_at)}
                      </p>
                      {doc.description && (
                        <p className="text-xs text-stone-400 mt-0.5 italic">{doc.description}</p>
                      )}
                      {doc.review_notes && (
                        <p className="text-xs text-stone-600 mt-1 bg-stone-50 px-2 py-1 rounded-lg">
                          Admin note: {doc.review_notes}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[doc.status] ?? ""}`}>
                        {doc.status.replace("_", " ")}
                      </span>
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-green-700 hover:text-green-800 font-medium">
                        View →
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
