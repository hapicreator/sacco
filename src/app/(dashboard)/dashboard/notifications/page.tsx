// FILE: src/app/(dashboard)/dashboard/notifications/page.tsx
// ACTION: REPLACE
// FIX: Was a placeholder causing 404 — now a real working page

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Bell, CheckCheck, Info, CreditCard, PiggyBank, AlertTriangle } from "lucide-react"
import { formatDate } from "@/lib/utils"
import MarkNotificationsRead from "@/components/dashboard/MarkNotificationsRead"

export const metadata = { title: "Notifications" }

const NOTIF_ICONS: Record<string, any> = {
  loan_approved:       CreditCard,
  loan_rejected:       AlertTriangle,
  deposit_received:    PiggyBank,
  withdrawal_processed:PiggyBank,
  general:             Info,
}

const NOTIF_COLORS: Record<string, string> = {
  loan_approved:       "bg-blue-50 text-blue-600",
  loan_rejected:       "bg-red-50 text-red-500",
  deposit_received:    "bg-green-50 text-green-600",
  withdrawal_processed:"bg-orange-50 text-orange-500",
  general:             "bg-stone-100 text-stone-500",
}

export default async function NotificationsPage() {
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

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, type, title, message, is_read, created_at")
    .eq("recipient_user_id", user.id)
    .eq("sacco_id", saccoUser.sacco_id)
    .order("created_at", { ascending: false })
    .limit(50)

  const all    = notifications ?? []
  const unread = all.filter((n) => !n.is_read).length

  return (
    <div className="space-y-6 pb-20 lg:pb-0 max-w-3xl">

      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-stone-900"
              style={{ fontFamily: "var(--font-heading, serif)" }}>
            Notifications
          </h2>
          <p className="text-sm text-stone-500 mt-0.5">
            {unread > 0 ? `${unread} unread notification${unread > 1 ? "s" : ""}` : "All caught up"}
          </p>
        </div>
        {unread > 0 && (
          <MarkNotificationsRead userId={user.id} saccoId={saccoUser.sacco_id} />
        )}
      </div>

      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
        {all.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-stone-400" />
            </div>
            <h3 className="text-base font-semibold text-stone-700 mb-1">No notifications yet</h3>
            <p className="text-sm text-stone-400">
              You will be notified about deposits, loans, and important updates here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-stone-50">
            {all.map((notif) => {
              const Icon  = NOTIF_ICONS[notif.type] ?? Bell
              const color = NOTIF_COLORS[notif.type] ?? "bg-stone-100 text-stone-500"
              return (
                <div key={notif.id}
                  className={`px-5 py-4 flex items-start gap-4 transition-colors ${
                    !notif.is_read ? "bg-blue-50/40" : "hover:bg-stone-50"
                  }`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-semibold ${!notif.is_read ? "text-stone-900" : "text-stone-700"}`}>
                        {notif.title}
                      </p>
                      {!notif.is_read && (
                        <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                    <p className="text-sm text-stone-500 mt-0.5 leading-relaxed">{notif.message}</p>
                    <p className="text-xs text-stone-400 mt-1">{formatDate(notif.created_at)}</p>
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
