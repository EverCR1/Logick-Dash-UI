import { useState, useEffect } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { Loader2, Eye, X, List, LayoutGrid, User } from 'lucide-react'
import { I } from '@/components/icons'
import { Select } from '@/components/ui/Select'
import { PageHeader } from '@/components/ui/PageHeader'
import { KpiGrid } from '@/components/ui/KpiGrid'
import { Pagination } from '@/components/ui/Pagination'
import { BuscadorToolbar } from '@/components/ui/BuscadorToolbar'
import { RangoFechas } from '@/components/ui/RangoFechas'
import { DetallePedido } from './DetallePedido'
import { ESTADO_PEDIDO } from './pedido-estados'
import { pedidosTiendaApi } from '@/lib/api'
import { useDebounce, useAutoPageSize, vistaInicial } from '@/lib/hooks'
import { q, fmtFecha } from '@/lib/format'
import type { Pedido, PedidoFiltros, PedidoSort } from '@/types/pedido'

const PER_PAGE = 15

type Vista = 'tabla' | 'cards'

export default function PedidosPage() {
  const [search, setSearch] = useState('')
  const searchDebounced = useDebounce(search)
  const [estado, setEstado] = useState('todos')
  const [sort, setSort] = useState<PedidoSort>('fecha_desc')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [vista, setVista] = useState<Vista>(() => vistaInicial('pedidos_vista'))
  const [page, setPage] = useState(1)
  const [verId, setVerId] = useState<number | null>(null)

  useEffect(() => { localStorage.setItem('pedidos_vista', vista) }, [vista])

  const { ref: cardsRef, perPage: autoPerPage } = useAutoPageSize({ rows: 4 })
  const perPage = vista === 'cards' ? autoPerPage : PER_PAGE
  useEffect(() => { setPage(1) }, [perPage])

  const filtros: PedidoFiltros = {
    search: searchDebounced || undefined,
    estado: estado !== 'todos' ? estado : undefined,
    sort: sort !== 'fecha_desc' ? sort : undefined,
    fecha_inicio: desde || undefined,
    fecha_fin: hasta || undefined,
    page, per_page: perPage,
  }

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['pedidos-tienda', filtros],
    queryFn: () => pedidosTiendaApi.listar(filtros),
    placeholderData: keepPreviousData,
  })

  const pedidos = data?.pedidos.data ?? []
  const counts = data?.counts
  const meta = data?.pedidos
  // El boton "Limpiar" solo aparece con 2+ filtros: con uno solo se quita
  // directamente desde su propio control (la X del buscador o volver a "todos").
  const filtrosActivos = [!!search, estado !== 'todos', sort !== 'fecha_desc', !!desde || !!hasta].filter(Boolean).length
  const hayFiltros = filtrosActivos >= 2
  const limpiarFiltros = () => {
    setSearch(''); setEstado('todos'); setSort('fecha_desc'); setDesde(''); setHasta(''); setPage(1)
  }
  const cambiarRango = (r: { desde: string; hasta: string }) => {
    setDesde(r.desde); setHasta(r.hasta); setPage(1)
  }

  return (
    <>
      <PageHeader title="Pedidos" subtitle="Pedidos recibidos desde la tienda en línea" />

      {counts && (
        <KpiGrid items={[
          { label: 'Total', value: counts.total, icon: I.Store, tone: 'accent', sub: 'pedidos', onClick: () => { setEstado('todos'); setPage(1) }, activo: estado === 'todos' },
          { label: 'Activos', value: counts.activos, icon: I.Clock, tone: 'warn', sub: 'en proceso' },
          { label: 'Pendientes', value: counts.pendiente, icon: I.Inbox, tone: 'info', sub: 'por confirmar', onClick: () => { setEstado(estado === 'pendiente' ? 'todos' : 'pendiente'); setPage(1) }, activo: estado === 'pendiente' },
          { label: 'Enviados', value: counts.enviado, icon: I.Truck, tone: 'violet', sub: 'en camino', onClick: () => { setEstado(estado === 'enviado' ? 'todos' : 'enviado'); setPage(1) }, activo: estado === 'enviado' },
          { label: 'Entregados', value: counts.entregado, icon: I.CheckCircle, tone: 'pos', sub: 'completados', onClick: () => { setEstado(estado === 'entregado' ? 'todos' : 'entregado'); setPage(1) }, activo: estado === 'entregado' },
          { label: 'Cancelados', value: counts.cancelado, icon: I.Ban, tone: 'neg', sub: 'anulados', onClick: () => { setEstado(estado === 'cancelado' ? 'todos' : 'cancelado'); setPage(1) }, activo: estado === 'cancelado' },
        ]} />
      )}

      <div className="toolbar">
        <BuscadorToolbar placeholder="Buscar por N° pedido, nombre o email…" value={search} onChange={(v) => { setSearch(v); setPage(1) }} cargando={isFetching} />
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
        <Select value={sort} onValueChange={(v) => { setSort(v as PedidoSort); setPage(1) }} ariaLabel="Ordenar por"
          options={[
            { value: 'fecha_desc', label: 'Más recientes' },
            { value: 'fecha_asc', label: 'Más antiguos' },
            { value: 'total_desc', label: 'Mayor total' },
            { value: 'total_asc', label: 'Menor total' },
          ]} />
        <RangoFechas desde={desde} hasta={hasta} onChange={cambiarRango}
          onLimpiar={() => cambiarRango({ desde: '', hasta: '' })} />
        {hayFiltros && <button className="btn" onClick={limpiarFiltros} title="Limpiar filtros"><X size={15} /> Limpiar</button>}
        <div className="view-toggle">
          <button data-on={vista === 'tabla'} onClick={() => setVista('tabla')} title="Vista de tabla"><List /></button>
          <button data-on={vista === 'cards'} onClick={() => setVista('cards')} title="Vista de tarjetas"><LayoutGrid /></button>
        </div>
      </div>

      {isLoading ? (
        <div className="card"><div className="empty" style={{ padding: 80 }}><Loader2 size={26} className="spin" style={{ color: 'var(--accent)' }} /><div>Cargando…</div></div></div>
      ) : isError ? (
        <div className="card"><div className="empty" style={{ padding: 80 }}><I.AlertCircle /><div>No se pudieron cargar los pedidos</div>
          <button className="btn" style={{ marginTop: 10 }} onClick={() => refetch()}><I.Refresh /> Reintentar</button></div></div>
      ) : pedidos.length === 0 ? (
        <div className="card"><div className="empty" style={{ padding: 80 }}><I.Store /><div>No se encontraron pedidos</div></div></div>
      ) : vista === 'cards' ? (
        <>
          <div className="ccards" ref={cardsRef}>
            {pedidos.map((p) => <PedidoCard key={p.id} pedido={p} onVer={() => setVerId(p.id)} />)}
          </div>
          {meta && meta.last_page > 1 && <div className="card"><Pagination meta={meta} page={page} setPage={setPage} /></div>}
        </>
      ) : (
        <div className="card">
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
        </div>
      )}

      <DetallePedido open={verId !== null} onClose={() => setVerId(null)} pedidoId={verId} />
    </>
  )
}

// ── Tarjeta de pedido ─────────────────────────────────────────────────────────

function PedidoCard({ pedido: p, onVer }: { pedido: Pedido; onVer: () => void }) {
  const badge = ESTADO_PEDIDO[p.estado]
  return (
    <div className="ccard" onClick={onVer}>
      <div className="rc-head">
        <div style={{ minWidth: 0 }}>
          <div className="rc-title">{p.numero_pedido}</div>
          <div className="rc-sub">{p.nombre}</div>
        </div>
        <span className="badge" data-tone={badge.tone}><span className="b-dot" />{badge.label}</span>
      </div>

      <div className="rc-body">
        <div className="rc-line"><span className="lbl">Total</span><span className="val tnum">{q(p.total)}</span></div>
        <div className="rc-line"><span className="lbl">Método</span><span className="val" style={{ textTransform: 'capitalize' }}>{(p.metodo_pago ?? '—').replace('_', ' ')}</span></div>
        <div className="rc-line"><span className="lbl">Fecha</span><span className="val">{fmtFecha(p.created_at)}</span></div>
      </div>

      <div className="rc-foot" onClick={(e) => e.stopPropagation()}>
        <span className="rc-who"><User />{p.email || 'Cliente'}</span>
        <div className="row-actions">
          <button className="icon-action" data-variant="view" title="Ver detalle" onClick={onVer}><Eye /></button>
        </div>
      </div>
    </div>
  )
}
