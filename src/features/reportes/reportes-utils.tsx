import { Loader2, ArrowUp, ArrowDown, Minus } from 'lucide-react'
import { I } from '@/components/icons'
import type { AreaPoint } from '@/components/charts'
import { fmtN, fechaLocal as iso } from '@/lib/format'

// Los helpers de rango de fechas viven junto al componente que los usa:
// @/components/ui/RangoFechas (rangoPorDefecto, rangoDePeriodo, Periodo).

// ── Comparación contra el periodo anterior ──────────────────────────────────

/** Suma n días a una fecha ISO (YYYY-MM-DD) sin pasar por UTC. */
export function desplazarDias(fecha: string, n: number): string {
  const [y, m, d] = fecha.split('-').map(Number)
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1)
  dt.setDate(dt.getDate() + n)
  return iso(dt)
}

/** Días ISO entre dos fechas, inclusive. Se limita para no generar series enormes. */
export function diasEntre(desde: string, hasta: string, tope = 400): string[] {
  const dias: string[] = []
  let actual = desde
  while (actual <= hasta && dias.length < tope) {
    dias.push(actual)
    actual = desplazarDias(actual, 1)
  }
  return dias
}

/** Rango inmediatamente anterior, de la misma longitud que el actual. */
export function rangoPrevio(desde: string, hasta: string): { desde: string; hasta: string } {
  const largo = diasEntre(desde, hasta).length || 1
  const fin = desplazarDias(desde, -1)
  return { desde: desplazarDias(fin, -(largo - 1)), hasta: fin }
}

export interface FilaFechada { created_at: string; total: number | string }

/** Suma por día (clave YYYY-MM-DD) a partir de filas con created_at. */
function sumarPorDia(filas: FilaFechada[]): Map<string, number> {
  const mapa = new Map<string, number>()
  for (const f of filas) {
    const dia = (f.created_at ?? '').slice(0, 10)
    if (!dia) continue
    mapa.set(dia, (mapa.get(dia) ?? 0) + Number(f.total || 0))
  }
  return mapa
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const etiquetaDia = (fecha: string) => {
  const [, m, d] = fecha.split('-')
  return `${Number(d)}/${MESES[Number(m) - 1] ?? ''}`
}

/**
 * Serie diaria del periodo actual con el anterior superpuesto por posición:
 * el día 1 del rango actual se compara contra el día 1 del rango anterior.
 * Los días sin movimiento entran en 0 para que la curva sea continua.
 */
export function construirTendencia(
  desde: string, hasta: string, actuales: FilaFechada[], previas: FilaFechada[]
): { puntos: AreaPoint[]; totalActual: number; totalPrevio: number } {
  const dias = diasEntre(desde, hasta)
  const prev = rangoPrevio(desde, hasta)
  const diasPrev = diasEntre(prev.desde, prev.hasta)

  const mapaActual = sumarPorDia(actuales)
  const mapaPrevio = sumarPorDia(previas)

  const puntos: AreaPoint[] = dias.map((dia, i) => ({
    label: etiquetaDia(dia),
    current: mapaActual.get(dia) ?? 0,
    previous: mapaPrevio.get(diasPrev[i] ?? '') ?? 0,
  }))

  return {
    puntos,
    totalActual: puntos.reduce((s, p) => s + p.current, 0),
    totalPrevio: puntos.reduce((s, p) => s + p.previous, 0),
  }
}

/** Variación porcentual; null cuando no hay base de comparación. */
export function variacion(actual: number, previo: number): number | null {
  if (!previo) return null
  return ((actual - previo) / previo) * 100
}

/** Badge "↑ +18.4% vs. periodo anterior". Sin base previa muestra un estado neutro. */
export function BadgeVariacion({ valor, sufijo = 'vs. periodo anterior' }: { valor: number | null; sufijo?: string }) {
  if (valor === null) {
    return <span className="badge"><Minus size={11} /> Sin periodo anterior</span>
  }
  const sube = valor >= 0
  return (
    <span className="badge" data-tone={sube ? 'pos' : 'neg'}>
      {sube ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
      {sube ? '+' : ''}{valor.toFixed(1)}% {sufijo}
    </span>
  )
}

/** Leyenda Actual / Anterior del gráfico comparativo. */
export function LeyendaTendencia() {
  return (
    <div className="chart-legend">
      <span><span className="swatch" style={{ background: 'var(--accent)' }} />Actual</span>
      <span><span className="swatch" style={{ background: 'var(--info)', opacity: 0.55 }} />Anterior</span>
    </div>
  )
}

export type Tono = 'accent' | 'pos' | 'neg' | 'warn' | 'info' | 'violet'
export interface KpiItem { label: string; value: string | number; icon: React.ComponentType; tone?: Tono; sub?: string; currency?: string }

export function KpiStrip({ items, cols }: { items: KpiItem[]; cols?: number }) {
  return (
    <div className="kpi-grid" style={cols ? { gridTemplateColumns: `repeat(${cols}, 1fr)` } : undefined}>
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

// ── Callout de insight (dato destacado con icono) ───────────────────────────
export function Insight({ icon: Icono, tone = 'accent', title, sub }: {
  icon: React.ComponentType<{ size?: number }>; tone?: Tono; title: React.ReactNode; sub?: React.ReactNode
}) {
  return (
    <div className="insight">
      <span className="insight-icon" data-tone={tone}><Icono /></span>
      <div className="insight-main">
        <div className="insight-title">{title}</div>
        {sub && <div className="insight-sub">{sub}</div>}
      </div>
    </div>
  )
}

// ── Barra horizontal comparativa ────────────────────────────────────────────
export function BarRow({ label, valor, total, display, color = 'var(--accent)' }: {
  label: React.ReactNode; valor: number; total: number; display?: string; color?: string
}) {
  const porcentaje = total > 0 ? Math.round((valor / total) * 100) : 0
  return (
    <div>
      <div className="barrow-head">
        <span className="barrow-label">{label}</span>
        <span className="barrow-val tnum">{display ?? fmtN(valor)}</span>
      </div>
      <div className="barrow-track"><span style={{ width: `${porcentaje}%`, background: color }} /></div>
      <div className="barrow-pct tnum">{porcentaje}%</div>
    </div>
  )
}

export interface RankItem { name: string; sub?: string; value: string }

// ── Lista rankeada (top performers) ─────────────────────────────────────────
export function RankList({ items }: { items: RankItem[] }) {
  if (items.length === 0) return <div className="empty" style={{ padding: 32 }}><span className="muted">Sin datos</span></div>
  return (
    <div className="ranklist">
      {items.map((it, i) => (
        <div key={i} className="rank-row">
          <span className="rank" data-r={i + 1}>{i + 1}</span>
          <div className="rank-main">
            <div className="rank-name" title={it.name}>{it.name}</div>
            {it.sub && <div className="rank-sub">{it.sub}</div>}
          </div>
          <div className="rank-val tnum">{it.value}</div>
        </div>
      ))}
    </div>
  )
}

export interface HeroStat { label: string; value: string; delta?: string; tone?: 'pos' | 'neg' }

// ── Cabecera analítica: cifras grandes del periodo ──────────────────────────
export function HeroStats({ stats, style, children }: {
  stats: HeroStat[]; style?: React.CSSProperties; children?: React.ReactNode
}) {
  return (
    <div className="chart-summary" style={style}>
      {stats.map((s, i) => (
        <div key={i} className="chart-stat">
          <div className="label">{s.label}</div>
          <div className="value tnum" style={s.tone ? { color: `var(--${s.tone})` } : undefined}>{s.value}</div>
          {s.delta && <div className="delta">{s.delta}</div>}
        </div>
      ))}
      {children}
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
