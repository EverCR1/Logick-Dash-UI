import { X } from 'lucide-react'
import { fechaLocal as iso } from '@/lib/format'

export type Periodo = 'hoy' | 'semana' | 'mes' | 'personalizado'

/** Rango por defecto: inicio de mes → hoy. */
export function rangoPorDefecto(): { desde: string; hasta: string } {
  const hoy = new Date()
  return { desde: iso(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), hasta: iso(hoy) }
}

/** Rango que cubre un periodo rápido. La semana arranca en lunes. */
export function rangoDePeriodo(p: Exclude<Periodo, 'personalizado'>): { desde: string; hasta: string } {
  const hoy = new Date()
  const hasta = iso(hoy)

  if (p === 'hoy') return { desde: hasta, hasta }

  if (p === 'semana') {
    const dia = (hoy.getDay() + 6) % 7 // lunes = 0
    const inicio = new Date(hoy)
    inicio.setDate(hoy.getDate() - dia)
    return { desde: iso(inicio), hasta }
  }

  return { desde: iso(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), hasta }
}

/**
 * Deduce qué atajo corresponde al rango actual. Se calcula en vez de guardarse
 * para que quien use el componente no tenga que mantener un estado paralelo que
 * puede desincronizarse del rango real.
 */
function periodoActivo(desde: string, hasta: string): Periodo {
  for (const p of ['hoy', 'semana', 'mes'] as const) {
    const r = rangoDePeriodo(p)
    if (r.desde === desde && r.hasta === hasta) return p
  }
  return 'personalizado'
}

const PERIODOS: { key: Exclude<Periodo, 'personalizado'>; label: string }[] = [
  { key: 'hoy', label: 'Hoy' },
  { key: 'semana', label: 'Semana' },
  { key: 'mes', label: 'Mes' },
]

interface RangoFechasProps {
  desde: string
  hasta: string
  onChange: (rango: { desde: string; hasta: string }) => void
  /** Atajos Hoy / Semana / Mes. */
  atajos?: boolean
  /** Muestra una X para quitar el filtro; omitir cuando el rango es obligatorio. */
  onLimpiar?: () => void
  etiqueta?: string
}

/**
 * Filtro de rango de fechas. Ambos extremos son opcionales: la API acepta solo
 * "desde" o solo "hasta", así que un rango a medias es válido.
 */
export function RangoFechas({ desde, hasta, onChange, atajos = true, onLimpiar, etiqueta }: RangoFechasProps) {
  const activo = periodoActivo(desde, hasta)
  const hayRango = !!(desde || hasta)

  return (
    <div className="rango-fechas">
      {etiqueta && <span className="rango-etiqueta">{etiqueta}</span>}

      {atajos && (
        <div className="rango-atajos">
          {PERIODOS.map((p) => (
            <button key={p.key} type="button" data-on={activo === p.key}
              onClick={() => onChange(rangoDePeriodo(p.key))}>{p.label}</button>
          ))}
        </div>
      )}

      <input type="date" className="form-input rango-date" value={desde} max={hasta || undefined}
        onChange={(e) => onChange({ desde: e.target.value, hasta })} aria-label="Desde" />
      <span className="muted" style={{ fontSize: 12 }}>—</span>
      <input type="date" className="form-input rango-date" value={hasta} min={desde || undefined}
        onChange={(e) => onChange({ desde, hasta: e.target.value })} aria-label="Hasta" />

      {onLimpiar && hayRango && (
        <button type="button" className="icon-btn" onClick={onLimpiar} title="Quitar filtro de fechas" aria-label="Quitar filtro de fechas">
          <X size={14} />
        </button>
      )}
    </div>
  )
}
