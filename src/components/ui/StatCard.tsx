// FILE: src/components/ui/StatCard.tsx
// ACTION: NEW
//
// A reusable stat card used on the dashboard home screen.
// Shows a metric with a label, value, icon, and optional trend.

import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

type StatCardProps = {
  label:      string
  value:      string
  icon:       LucideIcon
  iconColor?: string    // tailwind bg color class e.g. 'bg-green-100'
  iconBg?:    string    // tailwind text color class e.g. 'text-green-700'
  trend?:     string    // e.g. '+12%' or '-3%'
  trendUp?:   boolean   // true = green, false = red
  sub?:       string    // small subtitle text
}

export default function StatCard({
  label,
  value,
  icon: Icon,
  iconColor = 'bg-green-100',
  iconBg    = 'text-green-700',
  trend,
  trendUp,
  sub,
}: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow duration-200">

      {/* Icon + Trend row */}
      <div className="flex items-start justify-between">
        <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center', iconColor)}>
          <Icon className={cn('w-5 h-5', iconBg)} />
        </div>

        {trend && (
          <span className={cn(
            'text-xs font-semibold px-2.5 py-1 rounded-full',
            trendUp
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-600'
          )}>
            {trend}
          </span>
        )}
      </div>

      {/* Value + Label */}
      <div>
        <p className="text-2xl font-bold text-stone-900 leading-none mb-1"
           style={{ fontFamily: 'var(--font-heading, serif)' }}>
          {value}
        </p>
        <p className="text-sm text-stone-500">{label}</p>
        {sub && <p className="text-xs text-stone-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}
