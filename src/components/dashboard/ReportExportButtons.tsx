// FILE: src/components/dashboard/ReportExportButtons.tsx
// ACTION: NEW
//
// Client component that provides CSV download and print buttons
// for any report table. Receives data as an array of objects.

"use client"

import { useState } from "react"
import { Download, Printer, CheckCircle } from "lucide-react"

type Props = {
  filename: string
  data:     Record<string, any>[]
  headers:  string[]
  keys:     string[]
}

export default function ReportExportButtons({ filename, data, headers, keys }: Props) {
  const [downloaded, setDownloaded] = useState(false)

  function handleCSVExport() {
    if (!data || data.length === 0) return

    // Build CSV content
    const headerRow = headers.join(",")
    const dataRows  = data.map((row) =>
      keys.map((key) => {
        const val = row[key] ?? ""
        // Wrap in quotes if the value contains commas or quotes
        const str = String(val)
        return str.includes(",") || str.includes('"') || str.includes("\n")
          ? `"${str.replace(/"/g, '""')}"`
          : str
      }).join(",")
    )

    const csvContent = [headerRow, ...dataRows].join("\n")
    const blob       = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url        = URL.createObjectURL(blob)

    const link       = document.createElement("a")
    link.href        = url
    link.download    = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    setDownloaded(true)
    setTimeout(() => setDownloaded(false), 2500)
  }

  function handlePrint() {
    window.print()
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleCSVExport}
        disabled={!data || data.length === 0}
        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${
          downloaded
            ? "bg-green-50 text-green-700 border-green-200"
            : "bg-white hover:bg-stone-50 text-stone-600 border-stone-200"
        } disabled:opacity-40 disabled:cursor-not-allowed`}
      >
        {downloaded ? (
          <><CheckCircle className="w-3.5 h-3.5" /> Downloaded!</>
        ) : (
          <><Download className="w-3.5 h-3.5" /> Export CSV</>
        )}
      </button>

      <button
        onClick={handlePrint}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-stone-50 text-stone-600 border border-stone-200 transition-colors"
      >
        <Printer className="w-3.5 h-3.5" /> Print
      </button>
    </div>
  )
}
