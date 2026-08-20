import { Link } from 'react-router-dom'
import { fmtN } from '@/lib/format'

export type KpiTono = 'accent' | 'pos' | 'neg' | 'warn' | 'info' | 'violet'

export interface KpiItem {
  label: string
  value: string | number
  icon: React.ComponentType
  tone?: KpiTono
  /** Texto secundario; se oculta en móvil para ganar altura. */
  sub?: string
  /** Símbolo antepuesto a la cifra, p. ej. "Q". */
  currency?: string
  /**
   * Aplica el filtro que representa este KPI. Se pasa solo en los que tienen un
   * filtro equivalente en la barra; los puramente informativos lo omiten y se
   * renderizan como tarjeta estática.
   */
  onClick?: () => void
  /**
   * Navega a la vista que desarrolla esta cifra, normalmente un detalle ya
   * filtrado. Excluyente con `onClick`: un KPI o filtra donde está, o lleva
   * a otra pantalla, no ambas.
   */
  to?: string
  /** El filtro de este KPI está aplicado: lo resalta y permite quitarlo. */
  activo?: boolean
}

interface KpiGridProps {
  items: KpiItem[]
  /** Columnas fijas; por defecto se ajustan al ancho disponible. */
  cols?: number
}

/**
 * Fila de indicadores del índice de cada módulo.
 *
 * Los KPIs que corresponden a un filtro son pulsables: al hacer clic lo aplican
 * y al volver a pulsarlos lo quitan, de modo que la fila funciona como un acceso
 * rápido además de como resumen.
 */
export function KpiGrid({ items, cols }: KpiGridProps) {
  return (
    <div
      className={cols ? 'kpi-grid' : 'kpi-grid kpi-grid-auto'}
      style={cols ? { gridTemplateColumns: `repeat(${cols}, 1fr)` } : undefined}
    >
      {items.map((k, i) => {
        const IconC = k.icon
        const contenido = (
          <>
            <div className="kpi-row1">
              <div className="kpi-label">{k.label}</div>
              <div className="kpi-icon" data-tone={k.tone ?? 'accent'}><IconC /></div>
            </div>
            <div className="kpi-value tnum">
              {k.currency && <span className="currency">{k.currency}</span>}
              {typeof k.value === 'number' ? fmtN(k.value) : k.value}
            </div>
            {k.sub && <div className="kpi-meta"><span>{k.sub}</span></div>}
          </>
        )

        if (k.to) {
          return (
            <Link key={i} to={k.to} className="kpi kpi-accion kpi-link" title={`Ver el detalle de ${k.label.toLowerCase()}`}>
              {contenido}
            </Link>
          )
        }

        if (!k.onClick) {
          return <div key={i} className="kpi">{contenido}</div>
        }

        return (
          <button
            key={i}
            type="button"
            className="kpi kpi-accion"
            data-activo={k.activo || undefined}
            aria-pressed={!!k.activo}
            title={k.activo ? `Quitar filtro: ${k.label}` : `Filtrar por ${k.label}`}
            onClick={k.onClick}
          >
            {contenido}
          </button>
        )
      })}
    </div>
  )
}
