// FILE: src/components/dashboard/MarkNotificationsRead.tsx
// ACTION: NEW
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCheck, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function MarkNotificationsRead({
  userId,
  saccoId,
}: {
  userId:  string
  saccoId: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleMarkAll() {
    setLoading(true)
    const supabase = createClient()
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("recipient_user_id", userId)
      .eq("sacco_id", saccoId)
      .eq("is_read", false)
    setLoading(false)
    router.refresh()
  }

  return (
    <button onClick={handleMarkAll} disabled={loading}
      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors disabled:opacity-50">
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCheck className="w-3.5 h-3.5" />}
      Mark all read
    </button>
  )
}
