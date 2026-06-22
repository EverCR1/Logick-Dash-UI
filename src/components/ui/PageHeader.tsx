import type { ReactNode } from 'react'

export function PageHeader({ title, subtitle, action }: {
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="page-head">
      <div>
        <div className="page-title">{title}</div>
        {subtitle && <div className="page-sub">{subtitle}</div>}
      </div>
      {action}
    </div>
  )
}
