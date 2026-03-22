// FILE: src/app/(dashboard)/dashboard/page.tsx
// ACTION: REPLACE
//
// The main dashboard home page.
// Shows different content based on the user's role:
//   - sacco_admin / staff: SACCO-wide stats + recent transactions + pending items
//   - member: their own savings balance, loan status, recent transactions

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  Users, PiggyBank, CreditCard, FileText,
  TrendingUp, AlertCircle, Clock, CheckCircle,
  Wallet, ArrowUpRight, ArrowDownRight,
} from 'lucide-react'
import StatCard from '@/components/ui/StatCard'
import { formatUGX, formatDate } from '@/lib/utils'
import type { UserRole } from '@/lib/types/database'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get the user's SACCO membership
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

  // ── Fetch data based on role ─────────────────────────────────────────────────

  // ADMIN / STAFF: fetch SACCO-wide stats
  let totalMembers    = 0
  let totalSavings    = 0
  let activeLoans     = 0
  let pendingDocs     = 0
  let recentTxns: any[] = []

  // MEMBER: fetch personal stats
  let memberSavings   = 0
  let memberLoanBalance = 0
  let memberTxns: any[] = []
  let memberId: string | null = null

  if (role === 'sacco_admin' || role === 'staff' || role === 'super_admin') {
    if (saccoId) {
      // Count active members
      const { count: mc } = await supabase
        .from('members')
        .select('id', { count: 'exact', head: true })
        .eq('sacco_id', saccoId)
        .eq('status', 'active')
      totalMembers = mc ?? 0

      // Sum all savings balances
      const { data: savingsData } = await supabase
        .from('accounts')
        .select('balance')
        .eq('sacco_id', saccoId)
        .eq('account_type', 'savings')
        .eq('is_active', true)
      totalSavings = savingsData?.reduce((sum, a) => sum + (a.balance ?? 0), 0) ?? 0

      // Count active loans
      const { count: lc } = await supabase
        .from('loans')
        .select('id', { count: 'exact', head: true })
        .eq('sacco_id', saccoId)
        .in('status', ['active', 'disbursed'])
      activeLoans = lc ?? 0

      // Count documents under review
      const { count: dc } = await supabase
        .from('documents')
        .select('id', { count: 'exact', head: true })
        .eq('sacco_id', saccoId)
        .eq('status', 'uploaded')
      pendingDocs = dc ?? 0

      // Recent transactions
      const { data: txnData } = await supabase
        .from('transactions')
        .select('id, transaction_type, amount, status, created_at, account:accounts(member:members(membership_number, profile:profiles(full_name)))')
        .eq('sacco_id', saccoId)
        .order('created_at', { ascending: false })
        .limit(6)
      recentTxns = txnData ?? []
    }
  } else {
    // MEMBER view
    const { data: memberData } = await supabase
      .from('members')
      .select('id')
      .eq('user_id', user.id)
      .eq('sacco_id', saccoId!)
      .single()

    memberId = memberData?.id ?? null

    if (memberId) {
      // Total savings
      const { data: savingsAcc } = await supabase
        .from('accounts')
        .select('balance')
        .eq('member_id', memberId)
        .eq('account_type', 'savings')
        .eq('is_active', true)
      memberSavings = savingsAcc?.reduce((sum, a) => sum + (a.balance ?? 0), 0) ?? 0

      // Active loan balance
      const { data: loanData } = await supabase
        .from('loans')
        .select('outstanding_balance')
        .eq('member_id', memberId)
        .in('status', ['active', 'disbursed'])
        .limit(1)
        .single()
      memberLoanBalance = loanData?.outstanding_balance ?? 0

      // Recent personal transactions
      const { data: myTxns } = await supabase
        .from('transactions')
        .select('id, transaction_type, amount, status, description, created_at')
        .eq('sacco_id', saccoId!)
        .in(
          'account_id',
          (await supabase
            .from('accounts')
            .select('id')
            .eq('member_id', memberId)
          ).data?.map((a: any) => a.id) ?? []
        )
        .order('created_at', { ascending: false })
        .limit(6)
      memberTxns = myTxns ?? []
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  const isAdmin = role === 'sacco_admin' || role === 'staff' || role === 'super_admin'

  return (
    <div className="space-y-6 pb-20 lg:pb-0">

      {/* ── Welcome banner ── */}
      <div className="bg-gradient-to-r from-green-700 to-green-600 rounded-2xl p-6 text-white">
        <p className="text-green-200 text-sm mb-1">Good day 👋</p>
        <h2 className="text-2xl font-bold mb-1" style={{ fontFamily: 'var(--font-heading, serif)' }}>
          Welcome to your dashboard
        </h2>
        <p className="text-green-200 text-sm">
          {isAdmin
            ? 'Here is an overview of your SACCO activity.'
            : 'Here is a summary of your account.'}
        </p>
      </div>

      {/* ── Stats grid ── */}
      {isAdmin ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Active Members"
            value={totalMembers.toLocaleString()}
            icon={Users}
            iconColor="bg-blue-50"
            iconBg="text-blue-600"
          />
          <StatCard
            label="Total Savings"
            value={formatUGX(totalSavings)}
            icon={PiggyBank}
            iconColor="bg-green-50"
            iconBg="text-green-700"
          />
          <StatCard
            label="Active Loans"
            value={activeLoans.toLocaleString()}
            icon={CreditCard}
            iconColor="bg-orange-50"
            iconBg="text-orange-600"
          />
          <StatCard
            label="Pending Documents"
            value={pendingDocs.toLocaleString()}
            icon={FileText}
            iconColor="bg-purple-50"
            iconBg="text-purple-600"
            sub={pendingDocs > 0 ? 'Needs review' : 'All clear'}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            label="Savings Balance"
            value={formatUGX(memberSavings)}
            icon={PiggyBank}
            iconColor="bg-green-50"
            iconBg="text-green-700"
          />
          <StatCard
            label="Loan Balance"
            value={memberLoanBalance > 0 ? formatUGX(memberLoanBalance) : 'No active loan'}
            icon={CreditCard}
            iconColor="bg-orange-50"
            iconBg="text-orange-600"
          />
        </div>
      )}

      {/* ── Recent transactions ── */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
          <h3 className="font-semibold text-stone-900" style={{ fontFamily: 'var(--font-heading, serif)' }}>
            Recent Transactions
          </h3>
          <a href="/dashboard/transactions"
             className="text-xs text-green-700 hover:text-green-800 font-medium transition-colors">
            View all →
          </a>
        </div>

        {/* Transaction list */}
        {(isAdmin ? recentTxns : memberTxns).length === 0 ? (
          <div className="py-12 text-center">
            <Wallet className="w-8 h-8 text-stone-300 mx-auto mb-3" />
            <p className="text-stone-400 text-sm">No transactions yet</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-50">
            {(isAdmin ? recentTxns : memberTxns).map((txn: any) => {
              const isCredit = ['deposit', 'loan_disbursement'].includes(txn.transaction_type)

              return (
                <div key={txn.id} className="px-5 py-3.5 flex items-center gap-4 hover:bg-stone-50 transition-colors">

                  {/* Icon */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isCredit ? 'bg-green-50' : 'bg-red-50'
                  }`}>
                    {isCredit
                      ? <ArrowDownRight className="w-4 h-4 text-green-600" />
                      : <ArrowUpRight className="w-4 h-4 text-red-500" />
                    }
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-800 capitalize">
                      {txn.transaction_type.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-stone-400">
                      {isAdmin
                        ? txn.account?.member?.profile?.full_name ?? 'Unknown member'
                        : txn.description ?? formatDate(txn.created_at)
                      }
                    </p>
                  </div>

                  {/* Amount + status */}
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-semibold ${isCredit ? 'text-green-700' : 'text-red-600'}`}>
                      {isCredit ? '+' : '-'}{formatUGX(txn.amount)}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      txn.status === 'completed'
                        ? 'bg-green-50 text-green-700'
                        : txn.status === 'pending'
                        ? 'bg-amber-50 text-amber-700'
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

      {/* ── Quick actions (admin only) ── */}
      {isAdmin && (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
          <h3 className="font-semibold text-stone-900 mb-4" style={{ fontFamily: 'var(--font-heading, serif)' }}>
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Add Member',     href: '/dashboard/members/new',      icon: Users,      color: 'bg-blue-50 text-blue-700   hover:bg-blue-100' },
              { label: 'New Loan',       href: '/dashboard/loans/new',         icon: CreditCard, color: 'bg-orange-50 text-orange-700 hover:bg-orange-100' },
              { label: 'Record Deposit', href: '/dashboard/transactions/new',  icon: PiggyBank,  color: 'bg-green-50 text-green-700  hover:bg-green-100' },
              { label: 'Review Docs',    href: '/dashboard/documents',         icon: FileText,   color: 'bg-purple-50 text-purple-700 hover:bg-purple-100' },
            ].map((action) => {
              const Icon = action.icon
              return (
                <a
                  key={action.href}
                  href={action.href}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-colors text-center ${action.color}`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{action.label}</span>
                </a>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Pending items alert (admin only) ── */}
      {isAdmin && pendingDocs > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              {pendingDocs} document{pendingDocs > 1 ? 's' : ''} waiting for review
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              Members have uploaded receipts or forms that need your attention.{' '}
              <a href="/dashboard/documents" className="font-semibold underline">
                Review now →
              </a>
            </p>
          </div>
        </div>
      )}

    </div>
  )
}
