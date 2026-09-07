import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { Loader2, Receipt, RefreshCw, ChevronsLeft } from 'lucide-react'
import { Select } from '@/components/ui/Select'
import { PageHeader } from '@/components/ui/PageHeader'
import { KpiGrid } from '@/components/ui/KpiGrid'
import { I } from '@/components/icons'
import { Pagination } from '@/components/ui/Pagination'
import { BuscadorToolbar } from '@/components/ui/BuscadorToolbar'
import { RangoFechas } from '@/components/ui/RangoFechas'
import { devolucionesApi } from '@/lib/api'
import { useDebounce } from '@/lib/hooks'
import { q, fmtN, fmtFecha } from '@/lib/format'
import type { Devolucion, DevolucionFiltros } from '@/types/devolucion'

const PER_PAGE = 15

const METODO_LABEL: Record<string, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
}

export default function DevolucionesPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const searchDebounced = useDebounce(search)
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [sort, setSort] = useState<DevolucionFiltros['sort']>('fecha_desc')
  const [page, setPage] = useState(1)

  const filtros: DevolucionFiltros = {
    search: searchDebounced || undefined,
    fecha_inicio: desde || undefined,
    fecha_fin: hasta || undefined,
    sort, page, per_page: PER_PAGE,
  }

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['devoluciones', filtros],
    queryFn: () => devolucionesApi.listar(filtros),
    placeholderData: keepPreviousData,
  })

  const devoluciones = data?.devoluciones.data ?? []
  const meta = data?.devoluciones
  // Los totales los agrega el servidor sobre el filtro completo. Antes se sumaba
  // la página visible, así que el contador hablaba del filtro y los importes de
  // la página: dos tarjetas juntas midiendo cosas distintas.
  const stats = data?.estadisticas

  const filtrosActivos = [!!search, !!desde || !!hasta, sort !== 'fecha_desc'].filter(Boolean).length
  const limpiar = () => { setSearch(''); setDesde(''); setHasta(''); setSort('fecha_desc'); setPage(1) }

  return (
    <>
      {/* Sin entrada en el menú, esta es la única salida: se llega desde Ventas
          y hay que poder volver. */}
      <div className="page-head">
        <button className="back-link" onClick={() => navigate('/ventas')}><ChevronsLeft /> Ventas</button>
      </div>

      <PageHeader title="Devoluciones" subtitle="Mercadería y servicios devueltos sobre ventas emitidas" />

      {stats && (
        <KpiGrid items={[
          { label: 'Devoluciones', value: fmtN(stats.total_devoluciones), icon: I.Cart, tone: 'accent', sub: 'en el filtro' },
          { label: 'Valor devuelto', value: fmtN(stats.valor_devuelto), currency: 'Q', icon: I.Cart, tone: 'neg', sub: 'mercadería y servicios' },
          { label: 'Salió de caja', value: fmtN(stats.salio_de_caja), currency: 'Q', icon: I.Cash, tone: 'warn', sub: 'reembolsado' },
          { label: 'Bajó deuda', value: fmtN(stats.bajo_deuda), currency: 'Q', icon: I.Card, tone: 'info', sub: 'sin salir de caja' },
          { label: 'Quedó a favor', value: fmtN(stats.quedo_a_favor), currency: 'Q', icon: I.Users, tone: 'violet', sub: 'saldo del cliente' },
        ]} />
      )}

      <div className="toolbar">
        <BuscadorToolbar placeholder="Buscar por N° de devolución, venta, cliente o motivo…"
          value={search} onChange={(v) => { setSearch(v); setPage(1) }} cargando={isFetching} />
        <RangoFechas desde={desde} hasta={hasta} onChange={(r) => { setDesde(r.desde); setHasta(r.hasta); setPage(1) }} />
        <Select value={sort ?? 'fecha_desc'} onValueChange={(v) => { setSort(v as DevolucionFiltros['sort']); setPage(1) }} ariaLabel="Orden"
          options={[
            { value: 'fecha_desc', label: 'Más recientes' },
            { value: 'fecha_asc', label: 'Más antiguas' },
            { value: 'monto_desc', label: 'Mayor monto' },
            { value: 'monto_asc', label: 'Menor monto' },
          ]} />
        {filtrosActivos >= 2 && <button className="btn" onClick={limpiar}>Limpiar</button>}
      </div>

      {isLoading ? (
        <div className="empty" style={{ padding: 80 }}><Loader2 size={24} className="spin" /></div>
      ) : isError ? (
        <div className="empty" style={{ padding: 80 }}>
          No se pudieron cargar las devoluciones
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => refetch()}>
            <RefreshCw size={15} /> Reintentar
          </button>
        </div>
      ) : devoluciones.length === 0 ? (
        <div className="empty" style={{ padding: 80 }}>Sin devoluciones que coincidan</div>
      ) : (
        <div className="card">
          <table className="tbl">
            <thead><tr>
              <th style={{ width: 150 }}>Devolución</th>
              <th style={{ width: 130 }}>Venta</th>
              <th>Cliente y motivo</th>
              {/* Un solo "Destino" en vez de tres columnas de importes: casi
                  siempre el dinero va a un único sitio, y las otras dos quedaban
                  llenas de guiones ocupando media tabla. */}
              <th style={{ width: 210 }}>Destino</th>
              <th className="num" style={{ width: 110 }}>Total</th>
              <th style={{ width: 110 }}>Fecha</th>
            </tr></thead>
            <tbody>
              {devoluciones.map((d) => {
                const lineas = d.detalles?.length ?? 0
                return (
                  <tr key={d.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{d.numero_devolucion}</div>
                      <div className="muted" style={{ fontSize: 11.5 }}>
                        {lineas} línea{lineas === 1 ? '' : 's'}
                      </div>
                    </td>
                    <td>
                      {d.venta ? (
                        <Link to={`/ventas?ver=${d.venta_id}`} className="link-venta" title="Ver la venta">
                          <Receipt size={11} /> {d.venta.numero_venta}
                        </Link>
                      ) : <span className="muted">—</span>}
                    </td>
                    <td>
                      <div>{d.cliente?.nombre ?? <span className="muted">Consumidor final</span>}</div>
                      <div className="muted" style={{ fontSize: 11.5, overflow: 'hidden', textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap', maxWidth: 320 }} title={d.motivo}>{d.motivo}</div>
                    </td>
                    <td><DestinoDevolucion devolucion={d} /></td>
                    <td className="num tnum" style={{ fontWeight: 600 }}>{q(d.total)}</td>
                    <td className="muted" style={{ fontSize: 12 }}>{fmtFecha(d.fecha)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {meta && <Pagination meta={meta} page={page} setPage={setPage} />}
        </div>
      )}
    </>
  )
}

/**
 * A dónde fue el dinero de una devolución.
 *
 * Puede repartirse entre tres destinos, pero en la práctica casi siempre va a
 * uno solo: mostrarlos como columnas dejaba dos llenas de guiones. Aquí se
 * listan únicamente los que recibieron algo.
 */
function DestinoDevolucion({ devolucion: d }: { devolucion: Devolucion }) {
  const partes = [
    Number(d.aplicado_a_deuda) > 0 && {
      tono: 'info' as const,
      texto: `${q(d.aplicado_a_deuda)} a deuda`,
    },
    Number(d.reembolsado) > 0 && {
      tono: 'warn' as const,
      texto: `${q(d.reembolsado)} ${d.metodo_reembolso ? METODO_LABEL[d.metodo_reembolso].toLowerCase() : 'en efectivo'}`,
    },
    Number(d.aplicado_a_saldo ?? 0) > 0 && {
      tono: undefined,
      texto: `${q(d.aplicado_a_saldo)} a favor`,
    },
  ].filter(Boolean) as { tono?: 'info' | 'warn'; texto: string }[]

  if (partes.length === 0) return <span className="muted">—</span>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-start' }}>
      {partes.map((p) => (
        <span key={p.texto} className="badge" data-tone={p.tono}>{p.texto}</span>
      ))}
    </div>
  )
}
