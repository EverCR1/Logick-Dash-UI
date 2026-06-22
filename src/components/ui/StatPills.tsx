import { fmtN } from '@/lib/format'

export interface StatPillItem {
  label: string
  value: number | string
  tone?: 'pos' | 'neg' | 'warn'
}

export function StatPills({ items }: { items: StatPillItem[] }) {
  return (
    <div className="stat-pills">
      {items.map((s, i) => (
        <div key={i} className="stat-pill" data-tone={s.tone}>
          <div className="v">{typeof s.value === 'number' ? fmtN(s.value) : s.value}</div>
          <div className="l">{s.label}</div>
        </div>
      ))}
    </div>
  )
}
