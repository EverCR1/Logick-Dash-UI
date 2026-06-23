import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, Eye, Ban, X } from 'lucide-react'
import { I } from '@/components/icons'
import { Select } from '@/components/ui/Select'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pagination } from '@/components/ui/Pagination'
import { DetalleVenta } from './DetalleVenta'
import { ESTADO_VENTA, METODO_LABEL, METODO_TONE } from './venta-estados'
import { ventasApi } from '@/lib/api'
import { useDebounce } from '@/lib/hooks'
import { q, fmtN, fmtFecha, fmtHora } from '@/lib/format'
import type { Venta, VentaFiltros } from '@/types/venta'

const PER_PAGE = 15

export default function VentasPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const searchDebounced = useDebounce(search)
  const [estado, setEstado] = useState('todos')
  const [metodo, setMetodo] = useState('todos')
  const [sort, setSort] = useState<VentaFiltros['sort']>('fecha_desc')
  const [page, setPage] = useState(1)
  const navigate = useNavigate()
  const [verId, setVerId] = useState<number | null>(null)
  const [aCancelar, setACancelar] = useState<Venta | null>(null)

  // Permite abrir el detalle de una venta desde otros módulos vía /ventas?ver=ID
  const [searchParams, setSearchParams] = useSearchParams()
  useEffect(() => {
    const ver = searchParams.get('ver')
    if (ver) setVerId(Number(ver))
  }, [searchParams])
  const cerrarDetalle = () => {
    setVerId(null)
    if (searchParams.has('ver')) { searchParams.delete('ver'); setSearchParams(searchParams, { replace: true }) }
  }

  const filtros: VentaFiltros = {
    search: searchDebounced || undefined,
    estado: estado !== 'todos' ? estado : undefined,
    metodo_pago: metodo !== 'todos' ? metodo : undefined,
    sort, page, per_page: PER_PAGE,
  }

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['ventas', filtros],
    queryFn: () => ventasApi.listar(filtros),
    placeholderData: keepPreviousData,
  })

  const cancelar = useMutation({
    mutationFn: (id: number) => ventasApi.cancelar(id),
    onSuccess: () => { toast.success('Venta cancelada'); setACancelar(null); queryClient.invalidateQueries({ queryKey: ['ventas'] }) },
    onError: () => toast.error('No se pudo cancelar la venta'),
  })

  const ventas = data?.ventas.data ?? []
  const stats = data?.estadisticas
  const meta = data?.ventas
  const hayFiltros = !!search || estado !== 'todos' || metodo !== 'todos' || sort !== 'fecha_desc'
  const limpiarFiltros = () => { setSearch(''); setEstado('todos'); setMetodo('todos'); setSort('fecha_desc'); setPage(1) }

  return (
    <>
      <PageHeader title="Ventas" subtitle="Punto de venta y registro de ventas"
        action={<button className="btn btn-primary" onClick={() => navigate('/ventas/nueva')}><I.Plus /> Nueva venta</button>} />

      {stats && (
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}>
          {[
            { label: 'Hoy', value: fmtN(stats.totales.hoy.total), currency: 'Q', icon: I.Cart, tone: 'pos' as const, sub: `${stats.totales.hoy.ventas} ventas` },
            { label: 'Semana', value: fmtN(stats.totales.semana.total), currency: 'Q', icon: I.Cal, tone: 'info' as const, sub: `${stats.totales.semana.ventas} ventas` },
            { label: 'Mes', value: fmtN(stats.totales.mes.total), currency: 'Q', icon: I.TrendUp, tone: 'violet' as const, sub: `${stats.totales.mes.ventas} ventas` },
            { label: 'Completadas', value: fmtN(stats.completadas), icon: I.CheckCircle, tone: 'pos' as const, sub: 'cerradas' },
            { label: 'Pendientes', value: fmtN(stats.pendientes), icon: I.Clock, tone: 'warn' as const, sub: 'por cobrar' },
            { label: 'Canceladas', value: fmtN(stats.canceladas), icon: I.Ban, tone: 'neg' as const, sub: 'anuladas' },
          ].map((k, i) => {
            const IconC = k.icon
            return (
              <div key={i} className="kpi">
                <div className="kpi-row1"><div className="kpi-label">{k.label}</div><div className="kpi-icon" data-tone={k.tone}><IconC /></div></div>
                <div className="kpi-value tnum">{k.currency && <span className="currency">{k.currency}</span>}{k.value}</div>
                <div className="kpi-meta"><span>{k.sub}</span></div>
              </div>
            )
          })}
        </div>
      )}

      <div className="toolbar">
        <div className="toolbar-search">
          <I.Search />
          <input placeholder="Buscar por N° venta, cliente o producto…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
          {isFetching && <Loader2 size={14} className="spin" style={{ color: 'var(--text-faint)' }} />}
        </div>
        <Select value={estado} onValueChange={(v) => { setEstado(v); setPage(1) }} ariaLabel="Estado"
          options={[
            { value: 'todos', label: 'Todos los estados' },
            { value: 'completada', label: 'Completadas' },
            { value: 'pendiente', label: 'Pendientes' },
            { value: 'cancelada', label: 'Canceladas' },
          ]} />
        <Select value={metodo} onValueChange={(v) => { setMetodo(v); setPage(1) }} ariaLabel="Método de pago"
          options={[
            { value: 'todos', label: 'Todos los métodos' },
            { value: 'efectivo', label: 'Efectivo' },
            { value: 'tarjeta', label: 'Tarjeta' },
            { value: 'transferencia', label: 'Transferencia' },
            { value: 'mixto', label: 'Mixto' },
            { value: 'credito', label: 'Crédito' },
          ]} />
        <Select value={sort ?? 'fecha_desc'} onValueChange={(v) => { setSort(v as VentaFiltros['sort']); setPage(1) }} ariaLabel="Orden"
          options={[
            { value: 'fecha_desc', label: 'Más recientes' },
            { value: 'fecha_asc', label: 'Más antiguas' },
            { value: 'total_desc', label: 'Mayor total' },
            { value: 'total_asc', label: 'Menor total' },
          ]} />
        {hayFiltros && <button className="btn" onClick={limpiarFiltros} title="Limpiar filtros"><X size={15} /> Limpiar</button>}
      </div>

      <div className="card">
        {isLoading ? (
          <div className="empty" style={{ padding: 80 }}><Loader2 size={26} className="spin" style={{ color: 'var(--accent)' }} /><div>Cargando…</div></div>
        ) : isError ? (
          <div className="empty" style={{ padding: 80 }}><I.AlertCircle /><div>No se pudieron cargar las ventas</div>
            <button className="btn" style={{ marginTop: 10 }} onClick={() => refetch()}><I.Refresh /> Reintentar</button></div>
        ) : ventas.length === 0 ? (
          <div className="empty" style={{ padding: 80 }}><I.Cart /><div>No se encontraron ventas</div></div>
        ) : (
          <>
            <table className="tbl">
              <thead><tr>
                <th className="num" style={{ width: 48 }}>No.</th>
                <th>N° Venta</th>
                <th>Cliente</th>
                <th className="num">Items</th>
                <th className="num">Total</th>
                <th>Método</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th style={{ width: 100, textAlign: 'right' }}>Acciones</th>
              </tr></thead>
              <tbody>
                {ventas.map((v, i) => {
                  const badge = ESTADO_VENTA[v.estado]
                  const items = v.detalles ?? []
                  const titulo = items.length
                    ? items.slice(0, 6).map((d) => `${d.cantidad}× ${d.descripcion}`).join('\n') + (items.length > 6 ? `\n…y ${items.length - 6} más` : '')
                    : ''
                  return (
                    <tr key={v.id} style={{ cursor: 'pointer' }} onClick={() => setVerId(v.id)}>
                      <td className="num muted tnum">{(meta?.from ?? 1) + i}</td>
                      <td style={{ fontWeight: 600, fontSize: 12 }}>{v.numero_venta}</td>
                      <td>{v.cliente?.nombre ?? <span className="muted">Consumidor final</span>}</td>
                      <td className="num">
                        {items.length > 0
                          ? <span className="badge" data-tone="info" title={titulo} style={{ cursor: 'help' }}><span className="b-dot" />{items.length} {items.length === 1 ? 'item' : 'items'}</span>
                          : <span className="muted tnum">0</span>}
                      </td>
                      <td className="num tnum" style={{ fontWeight: 600 }}>{q(v.total)}</td>
                      <td><span className="badge" data-tone={METODO_TONE[v.metodo_pago]}><span className="b-dot" />{METODO_LABEL[v.metodo_pago] ?? v.metodo_pago}</span></td>
                      <td>
                        <div style={{ fontSize: 12, fontWeight: 500 }}>{fmtFecha(v.created_at)}</div>
                        <div className="muted" style={{ fontSize: 11 }}>{fmtHora(v.created_at)}</div>
                      </td>
                      <td><span className="badge" data-tone={badge.tone}><span className="b-dot" />{badge.label}</span></td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="row-actions">
                          <button className="icon-action" data-variant="view" title="Ver detalle" onClick={() => setVerId(v.id)}><Eye /></button>
                          {v.estado !== 'cancelada' && (
                            <button className="icon-action" data-variant="delete" title="Cancelar venta" onClick={() => setACancelar(v)}><Ban /></button>
                          )}
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

      <DetalleVenta open={verId !== null} onClose={cerrarDetalle} ventaId={verId} />

      <ConfirmDialog open={!!aCancelar} onOpenChange={(o) => !o && setACancelar(null)}
        title="Cancelar venta" description={aCancelar ? `¿Cancelar la venta ${aCancelar.numero_venta}? Se revertirá el stock y el crédito asociado si existe.` : ''}
        confirmLabel="Cancelar venta" danger loading={cancelar.isPending}
        onConfirm={() => aCancelar && cancelar.mutate(aCancelar.id)} />
    </>
  )
}
