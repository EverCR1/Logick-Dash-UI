import { I, type IconName } from '@/components/icons'

export default function PlaceholderPage({ title, icon = 'Inbox' }: { title: string; icon?: IconName }) {
  const IconC = I[icon]
  return (
    <div className="card" style={{ minHeight: 400 }}>
      <div className="card-header">
        <div className="card-title"><span className="card-title-dot" />{title}</div>
        <button className="btn"><I.Plus /> Nuevo</button>
      </div>
      <div className="empty" style={{ padding: 80 }}>
        <IconC />
        <div style={{ marginTop: 8, fontWeight: 500, color: 'var(--text-muted)' }}>Sección de {title}</div>
        <div>Este módulo se construirá en una próxima fase.</div>
      </div>
    </div>
  )
}
