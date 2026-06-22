import { useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { Loader2, Eye, X } from 'lucide-react'
import { I } from '@/components/icons'
import { Select } from '@/components/ui/Select'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pagination } from '@/components/ui/Pagination'
import { DetallePedido } from './DetallePedido'
import { ESTADO_PEDIDO } from './pedido-estados'
import { pedidosTiendaApi } from '@/lib/api'
import { useDebounce } from '@/lib/hooks'
import { q, fmtN, fmtFecha } from '@/lib/format'
import type { PedidoFiltros } from '@/types/pedido'

const PER_PAGE = 15

export default function PedidosPage() {
  const [search, setSearch] = useState('')
  const searchDebounced = useDebounce(search)
  const [estado, setEstado] = useState('todos')
  const [page, setPage] = useState(1)
  const [verId, setVerId] = useState<number | null>(null)

  const filtros: PedidoFiltros = {
    search: searchDebounced || undefined,
    estado: estado !== 'todos' ? estado : undefined,
    page, per_page: PER_PAGE,
  }

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['pedidos-tienda', filtros],
    queryFn: () => pedidosTiendaApi.listar(filtros),
    placeholderData: keepPreviousData,
  })

  const pedidos = data?.pedidos.data ?? []
  const counts = data?.counts
  const meta = data?.pedidos
  const hayFiltros = !!search || estado !== 'todos'
  const limpiarFiltros = () => { setSearch(''); setEstado('todos'); setPage(1) }

  return (
    <>
      <PageHeader title="Pedidos" subtitle="Pedidos recibidos desde la tienda en línea" />

      {counts && (
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}>
          {[
            { label: 'Total', value: counts.total, icon: I.Store, tone: 'accent' as const, sub: 'pedidos' },
            { label: 'Activos', value: counts.activos, icon: I.Clock, tone: 'warn' as const, sub: 'en proceso' },
            { label: 'Pendientes', value: counts.pendiente, icon: I.Inbox, tone: 'info' as const, sub: 'por confirmar' },
            { label: 'Enviados', value: counts.enviado, icon: I.Truck, tone: 'violet' as const, sub: 'en camino' },
            { label: 'Entregados', value: counts.entregado, icon: I.CheckCircle, tone: 'pos' as const, sub: 'completados' },
            { label: 'Cancelados', value: counts.cancelado, icon: I.Ban, tone: 'neg' as const, sub: 'anulados' },
          ].map((k, i) => {
            const IconC = k.icon
            return (
              <div key={i} className="kpi">
                <div className="kpi-row1"><div className="kpi-label">{k.label}</div><div className="kpi-icon" data-tone={k.tone}><IconC /></div></div>
                <div className="kpi-value tnum">{fmtN(k.value)}</div>
                <div className="kpi-meta"><span>{k.sub}</span></div>
              </div>
            )
          })}
        </div>
      )}

      <div className="toolbar">
        <div className="toolbar-search">
          <I.Search />
          <input placeholder="Buscar por N° pedido, nombre o email…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
          {isFetching && <Loader2 size={14} className="spin" style={{ color: 'var(--text-faint)' }} />}
        </div>
        <Select value={estado} onValueChange={(v) => { setEstado(v); setPage(1) }} ariaLabel="Estado"
          options={[
            { value: 'todos', label: 'Todos los estados' },
            { value: 'pendiente', label: 'Pendiente' },
            { value: 'confirmado', label: 'Confirmado' },
            { value: 'en_preparacion', label: 'En preparación' },
            { value: 'enviado', label: 'Enviado' },
            { value: 'entregado', label: 'Entregado' },
            { value: 'cancelado', label: 'Cancelado' },
          ]} />
        {hayFiltros && <button className="btn" onClick={limpiarFiltros} title="Limpiar filtros"><X size={15} /> Limpiar</button>}
      </div>

      <div className="card">
        {isLoading ? (
          <div className="empty" style={{ padding: 80 }}><Loader2 size={26} className="spin" style={{ color: 'var(--accent)' }} /><div>Cargando…</div></div>
        ) : isError ? (
          <div className="empty" style={{ padding: 80 }}><I.AlertCircle /><div>No se pudieron cargar los pedidos</div>
            <button className="btn" style={{ marginTop: 10 }} onClick={() => refetch()}><I.Refresh /> Reintentar</button></div>
        ) : pedidos.length === 0 ? (
          <div className="empty" style={{ padding: 80 }}><I.Store /><div>No se encontraron pedidos</div></div>
        ) : (
          <>
            <table className="tbl">
              <thead><tr>
                <th className="num" style={{ width: 48 }}>No.</th>
                <th>N° Pedido</th>
                <th>Cliente</th>
                <th className="num">Total</th>
                <th>Método</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th style={{ width: 70, textAlign: 'right' }}>Ver</th>
              </tr></thead>
              <tbody>
                {pedidos.map((p, i) => {
                  const badge = ESTADO_PEDIDO[p.estado]
                  return (
                    <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => setVerId(p.id)}>
                      <td className="num muted tnum">{(meta?.from ?? 1) + i}</td>
                      <td style={{ fontWeight: 600, fontSize: 12 }}>{p.numero_pedido}</td>
                      <td>
                        <div style={{ fontSize: 12.5 }}>{p.nombre}</div>
                        {p.email && <div className="muted" style={{ fontSize: 11 }}>{p.email}</div>}
                      </td>
                      <td className="num tnum" style={{ fontWeight: 600 }}>{q(p.total)}</td>
                      <td className="muted" style={{ fontSize: 12, textTransform: 'capitalize' }}>{(p.metodo_pago ?? '—').replace('_', ' ')}</td>
                      <td className="muted" style={{ fontSize: 12 }}>{fmtFecha(p.created_at)}</td>
                      <td><span className="badge" data-tone={badge.tone}><span className="b-dot" />{badge.label}</span></td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="row-actions">
                          <button className="icon-action" data-variant="view" title="Ver detalle" onClick={() => setVerId(p.id)}><Eye /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {meta && <Pagination meta={meta} page={page} setPage={setPage} />}
          </>
        )}
      </div>

      <DetallePedido open={verId !== null} onClose={() => setVerId(null)} pedidoId={verId} />
    </>
  )
}
