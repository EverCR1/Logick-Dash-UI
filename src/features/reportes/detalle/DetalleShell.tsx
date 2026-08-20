import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { I } from '@/components/icons'
import { KpiGrid, type KpiItem } from '@/components/ui/KpiGrid'
import { Pagination, type PageMeta } from '@/components/ui/Pagination'

interface DetalleShellProps {
  titulo: string
  subtitulo?: string
  /** A dónde vuelve la flecha; normalmente la pestaña de origen del resumen. */
  volverA: string
  /** Barra de filtros del módulo. */
  filtros?: ReactNode
  /** Indicadores del recorte filtrado completo, no de la página visible. */
  kpis?: KpiItem[]
  /** Exportar u otras acciones del encabezado. */
  acciones?: ReactNode
  /** Refrescando en segundo plano con datos previos en pantalla. */
  cargandoFondo?: boolean
  isLoading: boolean
  isError: boolean
  vacio: boolean
  refetch: () => void
  /**
   * Ancho mínimo de la tabla antes de desplazarse en horizontal. Súbelo en las
   * tablas con muchas columnas de texto (nombres de cliente, producto), que se
   * vuelven ilegibles antes que las de solo cifras.
   */
  anchoTabla?: number
  /** Se omiten en las vistas que no paginan (vendedores, sucursales). */
  meta?: PageMeta
  page?: number
  setPage?: (updater: (p: number) => number) => void
  children: ReactNode
}

/**
 * Armazón compartido de las vistas de detalle de reportes.
 *
 * Cada módulo aporta sus filtros, sus KPIs y su tabla; el resto —volver,
 * encabezado, estados de carga, paginación— es igual en todos para que el
 * detalle de ganancias, ventas o inventario se sientan la misma pantalla.
 */
export function DetalleShell({
  titulo, subtitulo, volverA, filtros, kpis, acciones, cargandoFondo, anchoTabla,
  isLoading, isError, vacio, refetch, meta, page, setPage, children,
}: DetalleShellProps) {
  return (
    <>
      <div className="page-head">
        <div className="det-titulo">
          <Link to={volverA} className="icon-btn" title="Volver a reportes" aria-label="Volver a reportes">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="page-title">{titulo}</div>
            {subtitulo && <div className="page-sub">{subtitulo}</div>}
          </div>
        </div>
        {acciones}
      </div>

      {filtros}

      {kpis && kpis.length > 0 && <KpiGrid items={kpis} />}

      <div className="card">
        {isLoading ? (
          <div className="empty" style={{ padding: 70 }}>
            <Loader2 size={26} className="spin" style={{ color: 'var(--accent)' }} />
            <div>Cargando…</div>
          </div>
        ) : isError ? (
          <div className="empty" style={{ padding: 70 }}>
            <I.AlertCircle />
            <div>No se pudo cargar el detalle</div>
            <button className="btn" style={{ marginTop: 10 }} onClick={refetch}><I.Refresh /> Reintentar</button>
          </div>
        ) : vacio ? (
          <div className="empty" style={{ padding: 70 }}>
            <I.Search size={26} />
            <div>Ningún registro coincide con estos filtros</div>
          </div>
        ) : (
          <>
            <div
              className="det-tabla"
              data-cargando={cargandoFondo || undefined}
              style={anchoTabla ? ({ '--tabla-min': `${anchoTabla}px` } as React.CSSProperties) : undefined}
            >
              {children}
            </div>
            {meta && page !== undefined && setPage && <Pagination meta={meta} page={page} setPage={setPage} />}
          </>
        )}
      </div>
    </>
  )
}
