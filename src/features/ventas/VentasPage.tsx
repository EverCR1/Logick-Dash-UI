import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, Eye, Ban, X, List, LayoutGrid, SlidersHorizontal } from 'lucide-react'
import { I } from '@/components/icons'
import { Select } from '@/components/ui/Select'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pagination } from '@/components/ui/Pagination'
import { BuscadorToolbar } from '@/components/ui/BuscadorToolbar'
import { RangoFechas } from '@/components/ui/RangoFechas'
import { RangoNumerico } from '@/components/ui/RangoNumerico'
import { DetalleVenta } from './DetalleVenta'
import { ESTADO_VENTA, METODO_LABEL, METODO_TONE } from './venta-estados'
import { ventasApi } from '@/lib/api'
import { useDebounce, useAutoPageSize, vistaInicial } from '@/lib/hooks'
import { q, fmtN, fmtFecha, fmtHora } from '@/lib/format'
import type { Venta, VentaFiltros } from '@/types/venta'

const PER_PAGE = 15

type Vista = 'tabla' | 'cards'

function tituloItems(v: Venta): string {
  const items = v.detalles ?? []
  if (!items.length) return ''
  return items.slice(0, 6).map((d) => `${d.cantidad}× ${d.descripcion}`).join('\n') + (items.length > 6 ? `\n…y ${items.length - 6} más` : '')
}

export default function VentasPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const searchDebounced = useDebounce(search)
  const [estado, setEstado] = useState('todos')
  const [metodo, setMetodo] = useState('todos')
  const [sucursal, setSucursal] = useState('todos')
  const [vendedor, setVendedor] = useState('todos')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [montoMin, setMontoMin] = useState('')
  const [montoMax, setMontoMax] = useState('')
  // Se debouncean para no lanzar una petición por cada tecla del rango
  const montoMinDeb = useDebounce(montoMin)
  const montoMaxDeb = useDebounce(montoMax)
  const [sort, setSort] = useState<VentaFiltros['sort']>('fecha_desc')
  const [panelAbierto, setPanelAbierto] = useState(false)
  const [vista, setVista] = useState<Vista>(() => vistaInicial('ventas_vista'))
  const [page, setPage] = useState(1)
  const navigate = useNavigate()
  const [verId, setVerId] = useState<number | null>(null)
  const [aCancelar, setACancelar] = useState<Venta | null>(null)

  useEffect(() => { localStorage.setItem('ventas_vista', vista) }, [vista])

  const { ref: cardsRef, perPage: autoPerPage } = useAutoPageSize({ rows: 3 })
  const perPage = vista === 'cards' ? autoPerPage : PER_PAGE
  useEffect(() => { setPage(1) }, [perPage])

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
    sucursal_id: sucursal !== 'todos' ? Number(sucursal) : undefined,
    vendedor_id: vendedor !== 'todos' ? Number(vendedor) : undefined,
    fecha_inicio: desde || undefined,
    fecha_fin: hasta || undefined,
    monto_min: montoMinDeb ? Number(montoMinDeb) : undefined,
    monto_max: montoMaxDeb ? Number(montoMaxDeb) : undefined,
    sort, page, per_page: perPage,
  }

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['ventas', filtros],
    queryFn: () => ventasApi.listar(filtros),
    placeholderData: keepPreviousData,
  })

  const cancelar = useMutation({
    mutationFn: (id: number) => ventasApi.cancelar(id),
    onSuccess: () => {
      toast.success('Venta cancelada'); setACancelar(null)
      // Cancelar revierte stock y crédito → afecta ingreso/ganancia reconocidos
      for (const key of [['ventas'], ['dashboard'], ['dashboard-serie'], ['rep-resumen'], ['rep-ganancias'], ['creditos']]) {
        queryClient.invalidateQueries({ queryKey: key })
      }
    },
    onError: () => toast.error('No se pudo cancelar la venta'),
  })

  const ventas = data?.ventas.data ?? []
  const stats = data?.estadisticas
  const meta = data?.ventas
  const catalogos = data?.catalogos

  // Cuántos filtros del panel están activos: se muestra en el botón para que no
  // queden filtros aplicados fuera de la vista sin ninguna señal.
  const filtrosAvanzados = [
    sucursal !== 'todos', vendedor !== 'todos', !!desde || !!hasta, !!montoMin || !!montoMax,
  ].filter(Boolean).length

  // El botón "Limpiar" solo aparece con 2+ filtros: con uno solo se quita
  // directamente desde su propio control (la X del buscador o volver a "todos").
  const filtrosActivos = [!!search, estado !== 'todos', metodo !== 'todos', sort !== 'fecha_desc']
    .filter(Boolean).length + filtrosAvanzados
  const hayFiltros = filtrosActivos >= 2
  const limpiarFiltros = () => {
    setSearch(''); setEstado('todos'); setMetodo('todos'); setSort('fecha_desc')
    setSucursal('todos'); setVendedor('todos'); setDesde(''); setHasta('')
    setMontoMin(''); setMontoMax(''); setPage(1)
  }
  const cambiarRango = (r: { desde: string; hasta: string }) => {
    setDesde(r.desde); setHasta(r.hasta); setPage(1)
  }

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
        <BuscadorToolbar placeholder="Buscar por N° venta, cliente o producto…" value={search} onChange={(v) => { setSearch(v); setPage(1) }} cargando={isFetching} />
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
        <button className="btn" data-on={panelAbierto || undefined} onClick={() => setPanelAbierto((v) => !v)}
          title="Más filtros" aria-expanded={panelAbierto}>
          <SlidersHorizontal size={15} /> Más filtros
          {filtrosAvanzados > 0 && <span className="btn-conteo">{filtrosAvanzados}</span>}
        </button>
        {hayFiltros && <button className="btn" onClick={limpiarFiltros} title="Limpiar filtros"><X size={15} /> Limpiar</button>}
        <div className="view-toggle">
          <button data-on={vista === 'tabla'} onClick={() => setVista('tabla')} title="Vista de tabla"><List /></button>
          <button data-on={vista === 'cards'} onClick={() => setVista('cards')} title="Vista de tarjetas"><LayoutGrid /></button>
        </div>
      </div>

      {/* Filtros de acotación: quién, cuándo, cuánto */}
      {panelAbierto && (
        <div className="filtros-panel">
          <Select value={sucursal} onValueChange={(v) => { setSucursal(v); setPage(1) }} ariaLabel="Sucursal"
            options={[{ value: 'todos', label: 'Todas las sucursales' }, ...(catalogos?.sucursales ?? []).map((s) => ({ value: String(s.id), label: s.nombre }))]} />
          <Select value={vendedor} onValueChange={(v) => { setVendedor(v); setPage(1) }} ariaLabel="Vendedor"
            options={[{ value: 'todos', label: 'Todos los vendedores' }, ...(catalogos?.vendedores ?? []).map((v) => ({ value: String(v.id), label: v.nombre }))]} />
          <RangoFechas desde={desde} hasta={hasta} onChange={cambiarRango}
            onLimpiar={() => cambiarRango({ desde: '', hasta: '' })} />
          <RangoNumerico prefijo="Q" etiqueta="Monto" min={montoMin} max={montoMax}
            onChange={(r) => { setMontoMin(r.min); setMontoMax(r.max); setPage(1) }}
            onLimpiar={() => { setMontoMin(''); setMontoMax(''); setPage(1) }} />
        </div>
      )}

      {isLoading ? (
        <div className="card"><div className="empty" style={{ padding: 80 }}><Loader2 size={26} className="spin" style={{ color: 'var(--accent)' }} /><div>Cargando…</div></div></div>
      ) : isError ? (
        <div className="card"><div className="empty" style={{ padding: 80 }}><I.AlertCircle /><div>No se pudieron cargar las ventas</div>
          <button className="btn" style={{ marginTop: 10 }} onClick={() => refetch()}><I.Refresh /> Reintentar</button></div></div>
      ) : ventas.length === 0 ? (
        <div className="card"><div className="empty" style={{ padding: 80 }}><I.Cart /><div>No se encontraron ventas</div></div></div>
      ) : vista === 'cards' ? (
        <>
          <div className="ccards" ref={cardsRef}>
            {ventas.map((v) => (
              <VentaCard key={v.id} venta={v} onVer={() => setVerId(v.id)} onCancelar={() => setACancelar(v)} />
            ))}
          </div>
          {meta && meta.last_page > 1 && <div className="card"><Pagination meta={meta} page={page} setPage={setPage} /></div>}
        </>
      ) : (
        <div className="card">
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
                return (
                  <tr key={v.id} style={{ cursor: 'pointer' }} onClick={() => setVerId(v.id)}>
                    <td className="num muted tnum">{(meta?.from ?? 1) + i}</td>
                    <td style={{ fontWeight: 600, fontSize: 12 }}>{v.numero_venta}</td>
                    <td>{v.cliente?.nombre ?? <span className="muted">Consumidor final</span>}</td>
                    <td className="num">
                      {items.length > 0
                        ? <span className="badge" data-tone="info" title={tituloItems(v)} style={{ cursor: 'help' }}><span className="b-dot" />{items.length} {items.length === 1 ? 'item' : 'items'}</span>
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
                      <VentaAcciones cancelada={v.estado === 'cancelada'} onVer={() => setVerId(v.id)} onCancelar={() => setACancelar(v)} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {meta && <Pagination meta={meta} page={page} setPage={setPage} />}
        </div>
      )}

      <DetalleVenta open={verId !== null} onClose={cerrarDetalle} ventaId={verId} />

      <ConfirmDialog open={!!aCancelar} onOpenChange={(o) => !o && setACancelar(null)}
        title="Cancelar venta" description={aCancelar ? `¿Cancelar la venta ${aCancelar.numero_venta}? Se revertirá el stock y el crédito asociado si existe.` : ''}
        confirmLabel="Cancelar venta" danger loading={cancelar.isPending}
        onConfirm={() => aCancelar && cancelar.mutate(aCancelar.id)} />
    </>
  )
}

// ── Acciones compartidas (tabla y card) ───────────────────────────────────────

function VentaAcciones({ cancelada, onVer, onCancelar }: { cancelada: boolean; onVer: () => void; onCancelar: () => void }) {
  return (
    <div className="row-actions">
      <button className="icon-action" data-variant="view" title="Ver detalle" onClick={onVer}><Eye /></button>
      {!cancelada && (
        <button className="icon-action" data-variant="delete" title="Cancelar venta" onClick={onCancelar}><Ban /></button>
      )}
    </div>
  )
}

// ── Tarjeta de venta ──────────────────────────────────────────────────────────

function VentaCard({ venta: v, onVer, onCancelar }: { venta: Venta; onVer: () => void; onCancelar: () => void }) {
  const badge = ESTADO_VENTA[v.estado]
  const items = v.detalles ?? []
  return (
    <div className="ccard" onClick={onVer}>
      <div className="rc-head">
        <div style={{ minWidth: 0 }}>
          <div className="rc-title">{v.numero_venta}</div>
          <div className="rc-sub">{v.cliente?.nombre ?? 'Consumidor final'}</div>
        </div>
        <span className="badge" data-tone={badge.tone}><span className="b-dot" />{badge.label}</span>
      </div>

      <div className="rc-body">
        <div className="rc-line"><span className="lbl">Total</span><span className="val tnum" style={{ fontSize: 14 }}>{q(v.total)}</span></div>
        <div className="rc-line"><span className="lbl">Items</span>
          <span className="val" title={tituloItems(v)} style={{ cursor: items.length ? 'help' : 'default' }}>{items.length} {items.length === 1 ? 'item' : 'items'}</span>
        </div>
        <div className="rc-line"><span className="lbl">Fecha</span><span className="val">{fmtFecha(v.created_at)} · {fmtHora(v.created_at)}</span></div>
      </div>

      <div className="rc-foot" onClick={(e) => e.stopPropagation()}>
        <span className="badge" data-tone={METODO_TONE[v.metodo_pago]}><span className="b-dot" />{METODO_LABEL[v.metodo_pago] ?? v.metodo_pago}</span>
        <VentaAcciones cancelada={v.estado === 'cancelada'} onVer={onVer} onCancelar={onCancelar} />
      </div>
    </div>
  )
}
