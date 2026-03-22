// FILE: src/app/(dashboard)/layout.tsx
// ACTION: REPLACE
// FIX: Typed Supabase join result to avoid TS2322 on sacco prop, getUser() instead of getUser

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Sidebar from "@/components/dashboard/Sidebar"
import TopBar from "@/components/dashboard/TopBar"
import type { UserRole } from "@/lib/types/database"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // Fetch the user's profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .single()

  // Fetch their primary SACCO membership
  const { data: saccoUser } = await supabase
    .from("sacco_users")
    .select("role, sacco_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("joined_at", { ascending: true })
    .limit(1)
    .single()

  const role    = (saccoUser?.role ?? "member") as UserRole
  const saccoId = saccoUser?.sacco_id ?? null

  // Fetch SACCO details separately to get a properly typed object
  const { data: saccoData } = saccoId
    ? await supabase
        .from("saccos")
        .select("id, name, district, logo_url")
        .eq("id", saccoId)
        .single()
    : { data: null }

  // Build a typed sacco object that matches SaccoInfo in Sidebar
  const sacco = saccoData
    ? {
        id:       saccoData.id       as string,
        name:     saccoData.name     as string,
        district: saccoData.district as string | null,
        logo_url: saccoData.logo_url as string | null,
      }
    : null

  return (
    <div className="flex h-screen bg-stone-100 overflow-hidden">

      <Sidebar role={role} sacco={sacco} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar
          userName={profile?.full_name ?? user.email ?? "User"}
          userRole={role}
          saccoName={sacco?.name ?? ""}
        />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>

    </div>
  )
}
