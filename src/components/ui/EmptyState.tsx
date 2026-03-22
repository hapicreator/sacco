// FILE: src/components/ui/EmptyState.tsx
// ACTION: NEW
//
// A reusable empty state component.
// Shown when a table or list has no data yet.

import type { LucideIcon } from 'lucide-react'

type EmptyStateProps = {
  icon:        LucideIcon
  title:       string
  description: string
  action?:     React.ReactNode
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-stone-400" />
      </div>
      <h3 className="text-base font-semibold text-stone-700 mb-1"
          style={{ fontFamily: 'var(--font-heading, serif)' }}>
        {title}
      </h3>
      <p className="text-sm text-stone-400 max-w-sm leading-relaxed mb-5">
        {description}
      </p>
      {action}
    </div>
  )
}
