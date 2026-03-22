// FILE: src/components/dashboard/MemberTable.tsx
// ACTION: REPLACE
// FIX: Supabase joined queries return profile as an array, not a single object.
//      The Member type now accepts profile as the array shape Supabase returns,
//      and we safely access the first element with [0].

"use client"

import Link from "next/link"
import { Eye } from "lucide-react"
import { formatDate, getInitials } from "@/lib/utils"

// Supabase returns the joined profile as an array when using
// .select(`..., profile:profiles(...)`)
// So we type it as an array and access index [0] safely.
type ProfileRow = {
  full_name: string
  phone: string | null
  avatar_url: string | null
}

type Member = {
  id:                string
  membership_number: string
  status:            string
  occupation:        string | null
  created_at:        string
  profile:           ProfileRow[] | ProfileRow | null
}

const STATUS_STYLES: Record<string, string> = {
  active:    "bg-green-50 text-green-700",
  inactive:  "bg-stone-100 text-stone-500",
  suspended: "bg-red-50 text-red-600",
  exited:    "bg-orange-50 text-orange-600",
}

// Helper: safely get profile regardless of whether Supabase
// returns it as an array or a single object
function getProfile(profile: ProfileRow[] | ProfileRow | null): ProfileRow | null {
  if (!profile) return null
  if (Array.isArray(profile)) return profile[0] ?? null
  return profile
}

export default function MemberTable({ members }: { members: Member[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-stone-100 bg-stone-50">
            <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Member
            </th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider hidden sm:table-cell">
              Membership No.
            </th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider hidden md:table-cell">
              Phone
            </th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider hidden lg:table-cell">
              Joined
            </th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Status
            </th>
            <th className="text-right px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Action
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-50">
          {members.map((member) => {
            const profile     = getProfile(member.profile)
            const name        = profile?.full_name ?? "Unknown"
            const phone       = profile?.phone ?? "—"
            const initials    = getInitials(name)
            const statusStyle = STATUS_STYLES[member.status] ?? "bg-stone-100 text-stone-500"

            return (
              <tr key={member.id} className="hover:bg-stone-50 transition-colors group">

                {/* Name + avatar */}
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-green-700 rounded-full flex items-center justify-center flex-shrink-0">
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt={name}
                          className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <span className="text-white text-xs font-bold">{initials}</span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-stone-900">{name}</p>
                      {member.occupation && (
                        <p className="text-xs text-stone-400">{member.occupation}</p>
                      )}
                    </div>
                  </div>
                </td>

                {/* Membership number */}
                <td className="px-5 py-3.5 hidden sm:table-cell">
                  <span className="text-sm font-mono text-stone-600">
                    {member.membership_number}
                  </span>
                </td>

                {/* Phone */}
                <td className="px-5 py-3.5 hidden md:table-cell">
                  <span className="text-sm text-stone-600">{phone}</span>
                </td>

                {/* Joined date */}
                <td className="px-5 py-3.5 hidden lg:table-cell">
                  <span className="text-sm text-stone-500">
                    {formatDate(member.created_at)}
                  </span>
                </td>

                {/* Status badge */}
                <td className="px-5 py-3.5">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${statusStyle}`}>
                    {member.status}
                  </span>
                </td>

                {/* Action */}
                <td className="px-5 py-3.5 text-right">
                  <Link href={`/dashboard/members/${member.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 hover:text-green-800 transition-colors opacity-0 group-hover:opacity-100">
                    <Eye className="w-3.5 h-3.5" />
                    View
                  </Link>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
