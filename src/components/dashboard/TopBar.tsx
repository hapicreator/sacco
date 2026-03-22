// FILE: src/components/dashboard/TopBar.tsx
// ACTION: NEW
//
// The top navigation bar. Shows:
//   - Current page title (mobile: SACCO name)
//   - User's name and role
//   - Logout button

'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { LogOut, User, ChevronDown, Menu, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { getInitials } from '@/lib/utils'
import type { UserRole } from '@/lib/types/database'

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  sacco_admin: 'SACCO Admin',
  staff:       'Staff',
  member:      'Member',
}

// Maps href patterns to readable page titles
const PAGE_TITLES: Record<string, string> = {
  '/dashboard':               'Dashboard',
  '/dashboard/members':       'Members',
  '/dashboard/savings':       'Savings',
  '/dashboard/loans':         'Loans',
  '/dashboard/transactions':  'Transactions',
  '/dashboard/documents':     'Documents',
  '/dashboard/reports':       'Reports',
  '/dashboard/payments':      'Payment Methods',
  '/dashboard/notifications': 'Notifications',
  '/dashboard/settings':      'Settings',
  '/dashboard/saccos':        'All SACCOs',
  '/dashboard/audit':         'Audit Logs',
}

export default function TopBar({
  userName,
  userRole,
  saccoName,
}: {
  userName: string
  userRole: string
  saccoName: string
}) {
  const router   = useRouter()
  const pathname = usePathname()
  const [showMenu, setShowMenu] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const pageTitle = PAGE_TITLES[pathname] ?? 'Dashboard'

  async function handleLogout() {
    setIsLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="bg-white border-b border-stone-200 px-6 py-3 flex items-center justify-between flex-shrink-0 z-10">

      {/* Left: Page title */}
      <div>
        <h1 className="text-lg font-bold text-stone-900" style={{ fontFamily: 'var(--font-heading, serif)' }}>
          {pageTitle}
        </h1>
        <p className="text-xs text-stone-400 hidden sm:block">{saccoName}</p>
      </div>

      {/* Right: User menu */}
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-stone-100 transition-colors"
        >
          {/* Avatar */}
          <div className="w-8 h-8 bg-green-700 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">
              {getInitials(userName)}
            </span>
          </div>

          {/* Name + role (hidden on mobile) */}
          <div className="hidden sm:block text-left">
            <p className="text-sm font-semibold text-stone-800 leading-tight">{userName}</p>
            <p className="text-xs text-stone-400">{ROLE_LABELS[userRole] ?? userRole}</p>
          </div>

          <ChevronDown className={cn(
            'w-4 h-4 text-stone-400 transition-transform duration-200',
            showMenu && 'rotate-180'
          )} />
        </button>

        {/* Dropdown menu */}
        {showMenu && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowMenu(false)}
            />

            {/* Menu */}
            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl border border-stone-200 shadow-lg z-20 overflow-hidden">

              {/* User info header */}
              <div className="px-4 py-3 border-b border-stone-100">
                <p className="text-sm font-semibold text-stone-900">{userName}</p>
                <p className="text-xs text-stone-400">{ROLE_LABELS[userRole] ?? userRole}</p>
              </div>

              {/* Menu items */}
              <div className="p-1.5">
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-colors font-medium disabled:opacity-50"
                >
                  <LogOut className="w-4 h-4" />
                  {isLoggingOut ? 'Signing out...' : 'Sign out'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
