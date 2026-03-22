// FILE: src/components/dashboard/MemberStatusButton.tsx
// ACTION: NEW
//
// Client component that lets an admin change a member's status.
// Shows a dropdown with status options.

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

type Status = "active" | "inactive" | "suspended" | "exited"

const STATUS_OPTIONS: { value: Status; label: string; color: string }[] = [
  { value: "active",    label: "Set Active",    color: "text-green-700 hover:bg-green-50" },
  { value: "inactive",  label: "Set Inactive",  color: "text-stone-600 hover:bg-stone-50" },
  { value: "suspended", label: "Suspend",       color: "text-red-600   hover:bg-red-50"   },
  { value: "exited",    label: "Mark Exited",   color: "text-orange-600 hover:bg-orange-50" },
]

export default function MemberStatusButton({
  memberId,
  currentStatus,
}: {
  memberId: string
  currentStatus: string
}) {
  const router = useRouter()
  const [open, setOpen]         = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  async function changeStatus(newStatus: Status) {
    if (newStatus === currentStatus) { setOpen(false); return }
    setIsLoading(true)
    setOpen(false)

    const supabase = createClient()
    await supabase
      .from("members")
      .update({ status: newStatus })
      .eq("id", memberId)

    setIsLoading(false)
    router.refresh()
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={isLoading}
        className="inline-flex items-center gap-2 px-4 py-2 border border-stone-200 rounded-xl text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors disabled:opacity-50"
      >
        {isLoading
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating...</>
          : <><span>Change Status</span><ChevronDown className="w-4 h-4" /></>
        }
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-44 bg-white rounded-xl border border-stone-200 shadow-lg z-20 overflow-hidden">
            {STATUS_OPTIONS.filter((o) => o.value !== currentStatus).map((option) => (
              <button
                key={option.value}
                onClick={() => changeStatus(option.value)}
                className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${option.color}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
