// FILE: src/app/(dashboard)/dashboard/page.tsx
// Server Component — uses await createClient() which is correct for Next.js 15+/16

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CheckCircle } from 'lucide-react'
import LogoutButton from '@/components/auth/LogoutButton'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const { data: saccoUsers } = await supabase
    .from('sacco_users')
    .select('role, sacco:saccos(name, district)')
    .eq('user_id', user.id)
    .eq('is_active', true)

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
      <div className="max-w-lg w-full">
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-8 text-center">

          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>

          <h1 className="text-2xl font-bold text-stone-900 mb-2" style={{ fontFamily: 'var(--font-heading, serif)' }}>
            You&apos;re in! 🎉
          </h1>
          <p className="text-stone-500 text-sm mb-6">
            Welcome back,{' '}
            <span className="font-semibold text-stone-700">
              {profile?.full_name ?? user.email}
            </span>
            . Auth flow is working perfectly.
          </p>

          {saccoUsers && saccoUsers.length > 0 ? (
            <div className="bg-stone-50 rounded-xl p-4 mb-6 text-left space-y-3">
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Your SACCOs
              </p>
              {saccoUsers.map((su, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div>
                    {/* @ts-ignore */}
                    <p className="text-sm font-medium text-stone-800">{su.sacco?.name}</p>
                    {/* @ts-ignore */}
                    <p className="text-xs text-stone-400">{su.sacco?.district}</p>
                  </div>
                  <span className="text-xs bg-green-100 text-green-700 font-medium px-2 py-1 rounded-full capitalize">
                    {su.role.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-left">
              <p className="text-amber-700 text-sm">
                You haven&apos;t joined a SACCO yet.{' '}
                <a href="/onboarding" className="font-semibold underline">Set one up now →</a>
              </p>
            </div>
          )}

          <p className="text-xs text-stone-400 mb-6">
            🚧 Full dashboard coming in the next phase.
          </p>

          <LogoutButton />
        </div>
      </div>
    </div>
  )
}
