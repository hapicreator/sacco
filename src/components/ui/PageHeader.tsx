// FILE: src/components/ui/PageHeader.tsx
// ACTION: NEW
//
// A consistent page header used at the top of every dashboard page.
// Shows a title, optional subtitle, and optional action button.

type PageHeaderProps = {
  title:     string
  subtitle?: string
  action?:   React.ReactNode
}

export default function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h2 className="text-2xl font-bold text-stone-900"
            style={{ fontFamily: 'var(--font-heading, serif)' }}>
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm text-stone-500 mt-0.5">{subtitle}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
