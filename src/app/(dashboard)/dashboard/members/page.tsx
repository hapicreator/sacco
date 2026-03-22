// FILE: src/app/(dashboard)/dashboard/members/page.tsx
// ACTION: REPLACE
// FIX: profile is returned as array from Supabase join — access [0] safely
// FIX: search now works with array profile shape

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Users, UserPlus, Search } from "lucide-react"
import Link from "next/link"
import MemberTable from "@/components/dashboard/MemberTable"

export const metadata = { title: "Members" }

export default async function MembersPage({
  searchParams,
}: {
  searchParams: { search?: string; status?: string }
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
  if (saccoUser.role === "member") redirect("/dashboard")

  let query = supabase
    .from("members")
    .select(`
      id,
      membership_number,
      status,
      occupation,
      created_at,
      profile:profiles!user_id(full_name, phone, avatar_url)
    `)
    .eq("sacco_id", saccoUser.sacco_id)
    .order("created_at", { ascending: false })

  const status = searchParams.status
  if (status && status !== "all") {
    query = query.eq("status", status)
  }

  const { data: members } = await query
  const allData = members ?? []

  // Safely get profile from either array or object shape
  function getProfile(p: any) {
    if (!p) return null
    if (Array.isArray(p)) return p[0] ?? null
    return p
  }

  const search   = searchParams.search?.toLowerCase() ?? ""
  const filtered = search
    ? allData.filter((m) => {
        const prof  = getProfile(m.profile)
        const name  = prof?.full_name?.toLowerCase() ?? ""
        const phone = prof?.phone?.toLowerCase() ?? ""
        const num   = m.membership_number?.toLowerCase() ?? ""
        return name.includes(search) || phone.includes(search) || num.includes(search)
      })
    : allData

  const allCount      = allData.length
  const activeCount   = allData.filter((m) => m.status === "active").length
  const inactiveCount = allData.filter((m) => m.status !== "active").length

  return (
    <div className="space-y-6 pb-20 lg:pb-0">

      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-stone-900"
              style={{ fontFamily: "var(--font-heading, serif)" }}>
            Members
          </h2>
          <p className="text-sm text-stone-500 mt-0.5">
            {allCount} total member{allCount !== 1 ? "s" : ""} in your SACCO
          </p>
        </div>
        <Link href="/dashboard/members/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded-xl transition-colors">
          <UserPlus className="w-4 h-4" />
          Add Member
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total",    value: allCount,      color: "bg-stone-100 text-stone-700" },
          { label: "Active",   value: activeCount,   color: "bg-blue-50 text-blue-700"   },
          { label: "Inactive", value: inactiveCount, color: "bg-red-50 text-red-600"     },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-stone-900"
               style={{ fontFamily: "var(--font-heading, serif)" }}>
              {s.value}
            </p>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.color}`}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4">
        <form method="GET" className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              name="search" type="text"
              defaultValue={searchParams.search ?? ""}
              placeholder="Search by name, phone or membership number..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          <select name="status" defaultValue={searchParams.status ?? "all"}
            className="px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-blue-600">
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
            <option value="exited">Exited</option>
          </select>
          <button type="submit"
            className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded-xl transition-colors">
            Search
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center text-center px-6">
            <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-stone-400" />
            </div>
            <h3 className="text-base font-semibold text-stone-700 mb-1">
              {search ? "No members found" : "No members yet"}
            </h3>
            <p className="text-sm text-stone-400 max-w-sm mb-5">
              {search ? `No members match "${searchParams.search}".` : "Add your first member to get started."}
            </p>
            {!search && (
              <Link href="/dashboard/members/new"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded-xl transition-colors">
                <UserPlus className="w-4 h-4" />
                Add first member
              </Link>
            )}
          </div>
        ) : (
          <MemberTable members={filtered as any} />
        )}
      </div>
    </div>
  )
}
