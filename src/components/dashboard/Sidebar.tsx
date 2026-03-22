// FILE: src/components/dashboard/Sidebar.tsx
// ACTION: REPLACE
// THEME: Deep Blue — all green accents replaced with blue-700/blue-800

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, PiggyBank, CreditCard,
  FileText, Settings, BarChart3, Bell, Wallet,
  ShieldCheck, Building2, ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/lib/types/database'

type SaccoInfo = {
  id:       string
  name:     string
  district: string | null
  logo_url: string | null
} | null

type NavItem = {
  label: string
  href:  string
  icon:  React.ElementType
  roles: UserRole[]
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',       href: '/dashboard',                  icon: LayoutDashboard, roles: ['super_admin','sacco_admin','staff','member'] },
  { label: 'Members',         href: '/dashboard/members',          icon: Users,           roles: ['sacco_admin','staff']                        },
  { label: 'Savings',         href: '/dashboard/savings',          icon: PiggyBank,       roles: ['sacco_admin','staff','member']               },
  { label: 'Loans',           href: '/dashboard/loans',            icon: CreditCard,      roles: ['sacco_admin','staff','member']               },
  { label: 'Transactions',    href: '/dashboard/transactions',     icon: Wallet,          roles: ['sacco_admin','staff','member']               },
  { label: 'Documents',       href: '/dashboard/documents',        icon: FileText,        roles: ['sacco_admin','staff','member']               },
  { label: 'Reports',         href: '/dashboard/reports',          icon: BarChart3,       roles: ['sacco_admin','staff']                        },
  { label: 'Payment Methods', href: '/dashboard/payments',         icon: CreditCard,      roles: ['sacco_admin','staff','member']               },
  { label: 'Notifications',   href: '/dashboard/notifications',    icon: Bell,            roles: ['sacco_admin','staff','member']               },
  { label: 'Settings',        href: '/dashboard/settings',         icon: Settings,        roles: ['sacco_admin']                               },
  { label: 'All SACCOs',      href: '/dashboard/saccos',           icon: Building2,       roles: ['super_admin']                               },
  { label: 'Audit Logs',      href: '/dashboard/audit',            icon: ShieldCheck,     roles: ['super_admin','sacco_admin']                 },
]

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  sacco_admin: 'SACCO Admin',
  staff:       'Staff',
  member:      'Member',
}

const ROLE_COLORS: Record<UserRole, string> = {
  super_admin: 'bg-purple-100 text-purple-700',
  sacco_admin: 'bg-blue-100 text-blue-700',
  staff:       'bg-cyan-100 text-cyan-700',
  member:      'bg-stone-100 text-stone-600',
}

export default function Sidebar({ role, sacco }: { role: UserRole; sacco: SaccoInfo }) {
  const pathname     = usePathname()
  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role))

  return (
    <>
      {/* ── Desktop Sidebar ─────────────────────────────────────────────── */}
      <aside className="hidden lg:flex w-64 bg-slate-900 flex-col flex-shrink-0">

        {/* SACCO header */}
        <div className="p-5 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
              {sacco?.logo_url ? (
                <img src={sacco.logo_url} alt={sacco.name}
                  className="w-full h-full rounded-xl object-cover" />
              ) : (
                <span className="text-white font-bold text-base">
                  {sacco?.name?.slice(0, 1)?.toUpperCase() ?? 'S'}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate leading-tight">
                {sacco?.name ?? 'SACCO Smart Manager'}
              </p>
              <p className="text-xs text-slate-400 truncate">
                {sacco?.district ?? 'Uganda'}
              </p>
            </div>
          </div>
          <div className="mt-3">
            <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full', ROLE_COLORS[role])}>
              {ROLE_LABELS[role]}
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {visibleItems.map((item) => {
            const Icon     = item.icon
            const isActive = pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href))

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group',
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )}
              >
                <Icon className={cn(
                  'w-4 h-4 flex-shrink-0 transition-colors',
                  isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
                )} />
                <span className="flex-1">{item.label}</span>
                {isActive && <ChevronRight className="w-3 h-3 text-blue-200" />}
              </Link>
            )
          })}
        </nav>

        {/* Bottom */}
        <div className="p-4 border-t border-slate-700">
          <p className="text-xs text-slate-500 text-center">SACCO Smart Manager v1.0</p>
        </div>
      </aside>

      {/* ── Mobile Bottom Nav ────────────────────────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 z-50">
        <div className="flex items-center justify-around px-2 py-2">
          {visibleItems.slice(0, 5).map((item) => {
            const Icon     = item.icon
            const isActive = pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href))

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors',
                  isActive ? 'text-blue-400' : 'text-slate-400'
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
