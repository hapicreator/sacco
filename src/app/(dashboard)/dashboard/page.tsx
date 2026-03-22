// FILE: src/app/(dashboard)/dashboard/page.tsx
// ACTION: REPLACE
// THEME: Deep Blue — banner, icons, links updated from green to blue
// FIX: member name lookup handles profile as array from Supabase join

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  Users, PiggyBank, CreditCard, FileText,
  Wallet, ArrowUpRight, ArrowDownRight, AlertCircle,
} from 'lucide-react'
import StatCard from '@/components/ui/StatCard'
import { formatUGX, formatDate } from '@/lib/utils'
import type { UserRole } from '@/lib/types/database'

// Safely extract profile from Supabase joined query (returns array)
function getName(txn: any): string {
  try {
    const account = Array.isArray(txn.account) ? txn.account[0] : txn.account
    const member  = Array.isArray(account?.member) ? account.member[0] : account?.member
    const profile = Array.isArray(member?.profile) ? member.profile[0] : member?.profile
    return profile?.full_name ?? member?.membership_number ?? 'Unknown member'
  } catch {
    return 'Unknown member'
  }
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: saccoUser } = await supabase
    .from('sacco_users')
    .select('role, sacco_id, sacco:saccos(id, name, district)')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('joined_at', { ascending: true })
    .limit(1)
    .single()

  const role    = (saccoUser?.role ?? 'member') as UserRole
  const saccoId = saccoUser?.sacco_id ?? null
  const isAdmin = role === 'sacco_admin' || role === 'staff' || role === 'super_admin'

  // Admin stats
  let totalMembers = 0
  let totalSavings = 0
  let activeLoans  = 0
  let pendingDocs  = 0
  let recentTxns: any[] = []

  // Member stats
  let memberSavings     = 0
  let memberLoanBalance = 0
  let memberTxns: any[] = []
  let memberId: string | null = null

  if (isAdmin && saccoId) {
    const { count: mc } = await supabase
      .from('members').select('id', { count: 'exact', head: true })
      .eq('sacco_id', saccoId).eq('status', 'active')
    totalMembers = mc ?? 0

    const { data: savingsData } = await supabase
      .from('accounts').select('balance')
      .eq('sacco_id', saccoId).eq('account_type', 'savings').eq('is_active', true)
    totalSavings = savingsData?.reduce((s, a) => s + (a.balance ?? 0), 0) ?? 0

    const { count: lc } = await supabase
      .from('loans').select('id', { count: 'exact', head: true })
      .eq('sacco_id', saccoId).in('status', ['active', 'disbursed'])
    activeLoans = lc ?? 0

    const { count: dc } = await supabase
      .from('documents').select('id', { count: 'exact', head: true })
      .eq('sacco_id', saccoId).eq('status', 'uploaded')
    pendingDocs = dc ?? 0

    const { data: txnData } = await supabase
      .from('transactions')
      .select(`
        id, transaction_type, amount, status, created_at,
        account:accounts(
          member:members(
            membership_number,
            profile:profiles!user_id(full_name)
          )
        )
      `)
      .eq('sacco_id', saccoId)
      .order('created_at', { ascending: false })
      .limit(6)
    recentTxns = txnData ?? []

  } else if (saccoId) {
    const { data: memberData } = await supabase
      .from('members').select('id').eq('user_id', user.id).eq('sacco_id', saccoId).single()
    memberId = memberData?.id ?? null

    if (memberId) {
      const { data: savingsAcc } = await supabase
        .from('accounts').select('balance')
        .eq('member_id', memberId).eq('account_type', 'savings').eq('is_active', true)
      memberSavings = savingsAcc?.reduce((s, a) => s + (a.balance ?? 0), 0) ?? 0

      const { data: loanData } = await supabase
        .from('loans').select('outstanding_balance')
        .eq('member_id', memberId).in('status', ['active', 'disbursed']).limit(1).single()
      memberLoanBalance = loanData?.outstanding_balance ?? 0

      const { data: accs } = await supabase
        .from('accounts').select('id').eq('member_id', memberId)
      const accIds = accs?.map((a: any) => a.id) ?? []

      if (accIds.length > 0) {
        const { data: myTxns } = await supabase
          .from('transactions')
          .select('id, transaction_type, amount, status, description, created_at')
          .in('account_id', accIds)
          .order('created_at', { ascending: false })
          .limit(6)
        memberTxns = myTxns ?? []
      }
    }
  }

  const displayTxns = isAdmin ? recentTxns : memberTxns

  return (
    <div className="space-y-6 pb-20 lg:pb-0">

      {/* Welcome banner — deep blue */}
      <div className="bg-gradient-to-r from-blue-800 to-blue-700 rounded-2xl p-6 text-white">
        <p className="text-blue-200 text-sm mb-1">Good day 👋</p>
        <h2 className="text-2xl font-bold mb-1"
            style={{ fontFamily: 'var(--font-heading, serif)' }}>
          Welcome to your dashboard
        </h2>
        <p className="text-blue-200 text-sm">
          {isAdmin ? 'Here is an overview of your SACCO activity.' : 'Here is a summary of your account.'}
        </p>
      </div>

      {/* Stats grid */}
      {isAdmin ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Active Members"    value={totalMembers.toLocaleString()} icon={Users}     iconColor="bg-blue-50"   iconBg="text-blue-700"   />
          <StatCard label="Total Savings"     value={formatUGX(totalSavings)}        icon={PiggyBank} iconColor="bg-cyan-50"   iconBg="text-cyan-700"   />
          <StatCard label="Active Loans"      value={activeLoans.toLocaleString()}   icon={CreditCard}iconColor="bg-orange-50" iconBg="text-orange-600" />
          <StatCard label="Pending Documents" value={pendingDocs.toLocaleString()}   icon={FileText}  iconColor="bg-purple-50" iconBg="text-purple-600"
            sub={pendingDocs > 0 ? 'Needs review' : 'All clear'} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <StatCard label="Savings Balance" value={formatUGX(memberSavings)}
            icon={PiggyBank} iconColor="bg-blue-50" iconBg="text-blue-700" />
          <StatCard
            label="Loan Balance"
            value={memberLoanBalance > 0 ? formatUGX(memberLoanBalance) : 'No active loan'}
            icon={CreditCard} iconColor="bg-orange-50" iconBg="text-orange-600"
          />
        </div>
      )}

      {/* Recent transactions */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
          <h3 className="font-semibold text-stone-900"
              style={{ fontFamily: 'var(--font-heading, serif)' }}>
            Recent Transactions
          </h3>
          <a href="/dashboard/transactions"
             className="text-xs text-blue-700 hover:text-blue-800 font-medium transition-colors">
            View all →
          </a>
        </div>

        {displayTxns.length === 0 ? (
          <div className="py-12 text-center">
            <Wallet className="w-8 h-8 text-stone-300 mx-auto mb-3" />
            <p className="text-stone-400 text-sm">No transactions yet</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-50">
            {displayTxns.map((txn: any) => {
              const isCredit = ['deposit', 'loan_disbursement'].includes(txn.transaction_type)
              const memberName = isAdmin ? getName(txn) : null

              return (
                <div key={txn.id}
                  className="px-5 py-3.5 flex items-center gap-4 hover:bg-stone-50 transition-colors">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isCredit ? 'bg-blue-50' : 'bg-red-50'
                  }`}>
                    {isCredit
                      ? <ArrowDownRight className="w-4 h-4 text-blue-600" />
                      : <ArrowUpRight   className="w-4 h-4 text-red-500" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    {isAdmin && memberName && (
                      <p className="text-sm font-semibold text-stone-900">{memberName}</p>
                    )}
                    <p className={`text-sm ${isAdmin && memberName ? 'text-stone-500' : 'font-medium text-stone-800'} capitalize`}>
                      {txn.transaction_type.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-stone-400">{formatDate(txn.created_at)}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-semibold ${isCredit ? 'text-blue-700' : 'text-red-600'}`}>
                      {isCredit ? '+' : '-'}{formatUGX(txn.amount)}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      txn.status === 'completed' ? 'bg-blue-50 text-blue-700'
                      : txn.status === 'pending'  ? 'bg-amber-50 text-amber-700'
                      : 'bg-red-50 text-red-600'
                    }`}>
                      {txn.status}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Quick actions — admin */}
      {isAdmin && (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
          <h3 className="font-semibold text-stone-900 mb-4"
              style={{ fontFamily: 'var(--font-heading, serif)' }}>
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Add Member',     href: '/dashboard/members/new',     icon: Users,      color: 'bg-blue-50 text-blue-700 hover:bg-blue-100'     },
              { label: 'New Loan',       href: '/dashboard/loans/new',        icon: CreditCard, color: 'bg-orange-50 text-orange-700 hover:bg-orange-100'},
              { label: 'Record Deposit', href: '/dashboard/transactions/new', icon: PiggyBank,  color: 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100'     },
              { label: 'Review Docs',    href: '/dashboard/documents',        icon: FileText,   color: 'bg-purple-50 text-purple-700 hover:bg-purple-100'},
            ].map((action) => {
              const Icon = action.icon
              return (
                <a key={action.href} href={action.href}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-colors text-center ${action.color}`}>
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{action.label}</span>
                </a>
              )
            })}
          </div>
        </div>
      )}

      {/* Pending docs alert */}
      {isAdmin && pendingDocs > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              {pendingDocs} document{pendingDocs > 1 ? 's' : ''} waiting for review
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              <a href="/dashboard/documents" className="font-semibold underline">Review now →</a>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
