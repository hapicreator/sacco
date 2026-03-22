// FILE: src/components/dashboard/DocumentUploader.tsx
// ACTION: NEW
//
// Client component for uploading documents to Supabase Storage.
// Supports: receipts, loan forms, membership forms, identity documents.
// Files are stored in Supabase Storage bucket "documents".
// Metadata is saved in the documents table.

"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  Upload, FileText, X, CheckCircle,
  AlertCircle, Loader2, Image, File
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"

type DocumentType = "receipt" | "loan_form" | "membership_form" | "identity_document" | "other"

const DOC_TYPES: { value: DocumentType; label: string }[] = [
  { value: "receipt",           label: "Receipt / Payment Proof" },
  { value: "loan_form",         label: "Loan Application Form"   },
  { value: "membership_form",   label: "Membership Form"         },
  { value: "identity_document", label: "National ID / Passport"  },
  { value: "other",             label: "Other Document"          },
]

const ALLOWED_TYPES = [
  "image/jpeg", "image/png", "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
]

const MAX_SIZE_MB = 5

export default function DocumentUploader({
  saccoId,
  memberId,
  userId,
}: {
  saccoId:  string
  memberId: string | null
  userId:   string
}) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [selectedFile, setSelectedFile]   = useState<File | null>(null)
  const [docType, setDocType]             = useState<DocumentType>("receipt")
  const [description, setDescription]     = useState("")
  const [isUploading, setIsUploading]     = useState(false)
  const [error, setError]                 = useState<string | null>(null)
  const [isSuccess, setIsSuccess]         = useState(false)
  const [isDragging, setIsDragging]       = useState(false)

  function handleFileSelect(file: File) {
    setError(null)
    setIsSuccess(false)

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("File type not supported. Please upload a JPG, PNG, PDF, or Word document.")
      return
    }

    const sizeMB = file.size / (1024 * 1024)
    if (sizeMB > MAX_SIZE_MB) {
      setError(`File is too large. Maximum size is ${MAX_SIZE_MB}MB.`)
      return
    }

    setSelectedFile(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFileSelect(file)
  }

  function removeFile() {
    setSelectedFile(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  function getFileIcon(file: File) {
    if (file.type.startsWith("image/")) return <Image className="w-5 h-5 text-blue-500" />
    if (file.type === "application/pdf") return <FileText className="w-5 h-5 text-red-500" />
    return <File className="w-5 h-5 text-stone-500" />
  }

  async function handleUpload() {
    if (!selectedFile) return
    setIsUploading(true)
    setError(null)

    const supabase = createClient()

    // Create unique file path in storage
    const fileExt  = selectedFile.name.split(".").pop()
    const fileName = `${saccoId}/${userId}/${Date.now()}.${fileExt}`

    // Upload to Supabase Storage bucket "documents"
    const { data: storageData, error: storageError } = await supabase.storage
      .from("documents")
      .upload(fileName, selectedFile, {
        cacheControl: "3600",
        upsert: false,
      })

    if (storageError) {
      // If bucket doesn't exist, show helpful message
      if (storageError.message.includes("Bucket not found") || storageError.message.includes("bucket")) {
        setError("Storage bucket not set up. Please ask your admin to create a 'documents' bucket in Supabase Storage.")
      } else {
        setError(storageError.message)
      }
      setIsUploading(false)
      return
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from("documents")
      .getPublicUrl(fileName)

    // Save metadata to documents table
    const { error: dbError } = await supabase.from("documents").insert({
      sacco_id:       saccoId,
      member_id:      memberId,
      uploaded_by:    userId,
      document_type:  docType,
      status:         "uploaded",
      file_name:      selectedFile.name,
      file_url:       publicUrl,
      file_size_kb:   Math.round(selectedFile.size / 1024),
      mime_type:      selectedFile.type,
      description:    description.trim() || null,
    })

    if (dbError) {
      // Clean up the uploaded file if DB insert fails
      await supabase.storage.from("documents").remove([fileName])
      setError(dbError.message)
      setIsUploading(false)
      return
    }

    setIsUploading(false)
    setIsSuccess(true)
    setSelectedFile(null)
    setDescription("")
    if (fileInputRef.current) fileInputRef.current.value = ""

    // Refresh to show new document in list
    setTimeout(() => {
      setIsSuccess(false)
      router.refresh()
    }, 2000)
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 space-y-5">
      <h3 className="font-semibold text-stone-900"
          style={{ fontFamily: "var(--font-heading, serif)" }}>
        Upload a Document
      </h3>

      {/* Success message */}
      {isSuccess && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-green-700 text-sm font-medium">
            Document uploaded successfully! Your admin will review it shortly.
          </p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Document type */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1.5">
          Document type <span className="text-red-500">*</span>
        </label>
        <select
          value={docType}
          onChange={(e) => setDocType(e.target.value as DocumentType)}
          className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-green-600"
        >
          {DOC_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* File drop zone */}
      {!selectedFile ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
            isDragging
              ? "border-green-500 bg-green-50"
              : "border-stone-200 hover:border-green-400 hover:bg-stone-50"
          }`}
        >
          <Upload className={`w-8 h-8 mx-auto mb-3 ${isDragging ? "text-green-600" : "text-stone-400"}`} />
          <p className="text-sm font-medium text-stone-700 mb-1">
            Drop your file here, or click to browse
          </p>
          <p className="text-xs text-stone-400">
            JPG, PNG, PDF, or Word · Max {MAX_SIZE_MB}MB
          </p>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx"
            onChange={handleInputChange}
          />
        </div>
      ) : (
        /* Selected file preview */
        <div className="border border-stone-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-stone-100 rounded-lg flex items-center justify-center flex-shrink-0">
            {getFileIcon(selectedFile)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-stone-900 truncate">{selectedFile.name}</p>
            <p className="text-xs text-stone-400">
              {(selectedFile.size / 1024).toFixed(0)} KB
            </p>
          </div>
          <button
            onClick={removeFile}
            className="p-1 text-stone-400 hover:text-stone-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1.5">
          Description <span className="text-stone-400 font-normal">(optional)</span>
        </label>
        <input
          type="text"
          placeholder="e.g. Payment receipt for January savings"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-green-600"
        />
      </div>

      {/* Upload button */}
      <button
        onClick={handleUpload}
        disabled={!selectedFile || isUploading}
        className="w-full py-3 px-6 rounded-xl font-semibold text-white text-sm bg-green-700 hover:bg-green-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isUploading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
        ) : (
          <><Upload className="w-4 h-4" /> Upload Document</>
        )}
      </button>

      {/* Storage setup note */}
      <p className="text-xs text-stone-400 text-center">
        Files are stored securely in your SACCO&apos;s private storage.
      </p>
    </div>
  )
}
