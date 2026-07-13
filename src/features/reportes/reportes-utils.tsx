import { Loader2 } from 'lucide-react'
import { I } from '@/components/icons'
import { fmtN } from '@/lib/format'

// Fecha YYYY-MM-DD en hora LOCAL. Usar toISOString() daría UTC y, en zonas al oeste
// (Guatemala UTC−6), por la tarde/noche adelantaría al día siguiente.
const iso = (d: Date) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Rango por defecto: inicio de mes → hoy
export function rangoPorDefecto(): { desde: string; hasta: string } {
  const now = new Date()
  return { desde: iso(new Date(now.getFullYear(), now.getMonth(), 1)), hasta: iso(now) }
}

export type Periodo = 'hoy' | 'semana' | 'mes' | 'personalizado'

// Calcula el rango para un periodo rápido
export function rangoDePeriodo(p: Exclude<Periodo, 'personalizado'>): { desde: string; hasta: string } {
  const now = new Date()
  const hasta = iso(now)
  if (p === 'hoy') return { desde: hasta, hasta }
  if (p === 'semana') {
    const dia = (now.getDay() + 6) % 7 // lunes = 0
    const inicio = new Date(now); inicio.setDate(now.getDate() - dia)
    return { desde: iso(inicio), hasta }
  }
  return { desde: iso(new Date(now.getFullYear(), now.getMonth(), 1)), hasta } // mes
}

// Paleta para donuts / barras
export const PALETA = ['#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899', '#ef4444', '#14b8a6']

export type Tono = 'accent' | 'pos' | 'neg' | 'warn' | 'info' | 'violet'
export interface KpiItem { label: string; value: string | number; icon: React.ComponentType; tone?: Tono; sub?: string; currency?: string }

export function KpiStrip({ items }: { items: KpiItem[] }) {
  return (
    <div className="kpi-grid">
      {items.map((k, i) => {
        const IconC = k.icon
        return (
          <div key={i} className="kpi">
            <div className="kpi-row1"><div className="kpi-label">{k.label}</div><div className="kpi-icon" data-tone={k.tone ?? 'accent'}><IconC /></div></div>
            <div className="kpi-value tnum">{k.currency && <span className="currency">{k.currency}</span>}{typeof k.value === 'number' ? fmtN(k.value) : k.value}</div>
            {k.sub && <div className="kpi-meta"><span>{k.sub}</span></div>}
          </div>
        )
      })}
    </div>
  )
}

export function EstadoCarga({ isLoading, isError, vacio, refetch, children, icono: Icono = I.Activity }: {
  isLoading: boolean; isError: boolean; vacio: boolean
  refetch: () => void; children: React.ReactNode; icono?: React.ComponentType<{ size?: number }>
}) {
  if (isLoading) return <div className="empty" style={{ padding: 70 }}><Loader2 size={26} className="spin" style={{ color: 'var(--accent)' }} /><div>Cargando…</div></div>
  if (isError) return (
    <div className="empty" style={{ padding: 70 }}><I.AlertCircle /><div>No se pudo cargar el reporte</div>
      <button className="btn" style={{ marginTop: 10 }} onClick={refetch}><I.Refresh /> Reintentar</button></div>
  )
  if (vacio) return <div className="empty" style={{ padding: 70 }}><Icono size={26} /><div>Sin datos para el período seleccionado</div></div>
  return <>{children}</>
}
