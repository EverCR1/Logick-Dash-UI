import { useState } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, Pencil, Trash2, Wallet, X } from 'lucide-react'
import { I } from '@/components/icons'
import { Select } from '@/components/ui/Select'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pagination } from '@/components/ui/Pagination'
import { CreditoForm } from './CreditoForm'
import { RegistrarPago } from './RegistrarPago'
import { creditosApi } from '@/lib/api'
import { useDebounce } from '@/lib/hooks'
import { q, fmtN, fmtFecha } from '@/lib/format'
import type { Credito, CreditoEstado, CreditoFiltros } from '@/types/credito'

const PER_PAGE = 15

const ESTADO_BADGE: Record<CreditoEstado, { label: string; tone?: 'pos' | 'neg' | 'warn' }> = {
  activo: { label: 'Activo', tone: 'warn' },
  abonado: { label: 'Abonado' },
  pagado: { label: 'Pagado', tone: 'pos' },
}

export default function CreditosPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const searchDebounced = useDebounce(search)
  const [estado, setEstado] = useState('todos')
  const [sort, setSort] = useState<CreditoFiltros['sort']>('fecha_desc')
  const [page, setPage] = useState(1)
  const [aEliminar, setAEliminar] = useState<Credito | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editar, setEditar] = useState<Credito | null>(null)
  const [pagar, setPagar] = useState<Credito | null>(null)

  const filtros: CreditoFiltros = {
    search: searchDebounced || undefined,
    estado: estado !== 'todos' ? estado : undefined,
    sort, page, per_page: PER_PAGE,
  }

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['creditos', filtros],
    queryFn: () => creditosApi.listar(filtros),
    placeholderData: keepPreviousData,
  })

  const eliminar = useMutation({
    mutationFn: (id: number) => creditosApi.eliminar(id),
    onSuccess: () => { toast.success('Crédito eliminado'); setAEliminar(null); queryClient.invalidateQueries({ queryKey: ['creditos'] }) },
    onError: () => toast.error('No se pudo eliminar el crédito'),
  })

  const creditos = data?.creditos.data ?? []
  const stats = data?.estadisticas
  const meta = data?.creditos
  const hayFiltros = !!search || estado !== 'todos' || sort !== 'fecha_desc'
  const limpiarFiltros = () => { setSearch(''); setEstado('todos'); setSort('fecha_desc'); setPage(1) }

  const progreso = (c: Credito) => {
    const cap = Number(c.capital) || 0
    if (cap <= 0) return 0
    return Math.round(((cap - Number(c.capital_restante)) / cap) * 100)
  }

  return (
    <>
      <PageHeader title="Créditos" subtitle="Control de créditos y abonos de clientes"
        action={<button className="btn btn-primary" onClick={() => { setEditar(null); setFormOpen(true) }}><I.Plus /> Nuevo crédito</button>} />

      {stats && (
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          {[
            { label: 'Total', value: fmtN(stats.total_creditos), icon: I.Card, tone: 'accent' as const, sub: 'créditos' },
            { label: 'Activos', value: fmtN(stats.activos), icon: I.Clock, tone: 'warn' as const, sub: 'en curso' },
            { label: 'Abonados', value: fmtN(stats.abonados), icon: I.Wallet, tone: 'info' as const, sub: 'con abonos' },
            { label: 'Pagados', value: fmtN(stats.pagados), icon: I.CheckCircle, tone: 'pos' as const, sub: 'liquidados' },
            { label: 'Pendiente por cobrar', value: fmtN(Number(stats.capital_pendiente_activos) + Number(stats.capital_pendiente_abonados)), currency: 'Q', icon: I.Cash, tone: 'neg' as const, sub: 'capital pendiente' },
            { label: 'Recuperado', value: fmtN(stats.total_recuperado), currency: 'Q', icon: I.Trophy, tone: 'pos' as const, sub: 'cobrado' },
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
          <input placeholder="Buscar por cliente o concepto…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
          {isFetching && <Loader2 size={14} className="spin" style={{ color: 'var(--text-faint)' }} />}
        </div>
        <Select value={estado} onValueChange={(v) => { setEstado(v); setPage(1) }} ariaLabel="Estado"
          options={[
            { value: 'todos', label: 'Todos los estados' },
            { value: 'activo', label: 'Activos' },
            { value: 'abonado', label: 'Abonados' },
            { value: 'pagado', label: 'Pagados' },
          ]} />
        <Select value={sort ?? 'fecha_desc'} onValueChange={(v) => { setSort(v as CreditoFiltros['sort']); setPage(1) }} ariaLabel="Orden"
          options={[
            { value: 'fecha_desc', label: 'Más recientes' },
            { value: 'fecha_asc', label: 'Más antiguos' },
            { value: 'monto_desc', label: 'Mayor capital' },
            { value: 'monto_asc', label: 'Menor capital' },
          ]} />
        {hayFiltros && <button className="btn" onClick={limpiarFiltros} title="Limpiar filtros"><X size={15} /> Limpiar</button>}
      </div>

      <div className="card">
        {isLoading ? (
          <div className="empty" style={{ padding: 80 }}><Loader2 size={26} className="spin" style={{ color: 'var(--accent)' }} /><div>Cargando…</div></div>
        ) : isError ? (
          <div className="empty" style={{ padding: 80 }}><I.AlertCircle /><div>No se pudieron cargar los créditos</div>
            <button className="btn" style={{ marginTop: 10 }} onClick={() => refetch()}><I.Refresh /> Reintentar</button></div>
        ) : creditos.length === 0 ? (
          <div className="empty" style={{ padding: 80 }}><I.Card /><div>No se encontraron créditos</div></div>
        ) : (
          <>
            <table className="tbl">
              <thead><tr>
                <th className="num" style={{ width: 48 }}>No.</th>
                <th>Cliente</th>
                <th className="num">Capital</th>
                <th className="num">Restante</th>
                <th style={{ width: 140 }}>Progreso</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th style={{ width: 130, textAlign: 'right' }}>Acciones</th>
              </tr></thead>
              <tbody>
                {creditos.map((c, i) => {
                  const badge = ESTADO_BADGE[c.estado]
                  const pct = progreso(c)
                  const pagado = c.estado === 'pagado'
                  return (
                    <tr key={c.id}>
                      <td className="num muted tnum">{(meta?.from ?? 1) + i}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{c.nombre_cliente}</div>
                        {c.producto_o_servicio_dado && <div className="muted" style={{ fontSize: 11.5 }}>{c.producto_o_servicio_dado}</div>}
                      </td>
                      <td className="num tnum">{q(c.capital)}</td>
                      <td className="num tnum" style={{ fontWeight: 600, color: pagado ? 'var(--text-muted)' : undefined }}>{q(c.capital_restante)}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ flex: 1, height: 6, background: 'var(--bg-elev-2)', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: pct >= 100 ? '#22c55e' : 'var(--accent)' }} />
                          </div>
                          <span className="muted tnum" style={{ fontSize: 11, minWidth: 30, textAlign: 'right' }}>{pct}%</span>
                        </div>
                      </td>
                      <td className="muted" style={{ fontSize: 12 }}>{fmtFecha(c.fecha_credito)}</td>
                      <td><span className="badge" data-tone={badge.tone}><span className="b-dot" />{badge.label}</span></td>
                      <td>
                        <div className="row-actions">
                          {!pagado && (
                            <button className="icon-action" data-variant="activate" title="Registrar pago" onClick={() => setPagar(c)}><Wallet /></button>
                          )}
                          <button className="icon-action" data-variant="edit" title="Editar" onClick={() => { setEditar(c); setFormOpen(true) }}><Pencil /></button>
                          <button className="icon-action" data-variant="delete" title="Eliminar" onClick={() => setAEliminar(c)}><Trash2 /></button>
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

      <CreditoForm open={formOpen} onClose={() => setFormOpen(false)} credito={editar} />
      <RegistrarPago open={!!pagar} onClose={() => setPagar(null)} credito={pagar} />

      <ConfirmDialog open={!!aEliminar} onOpenChange={(o) => !o && setAEliminar(null)}
        title="Eliminar crédito" description={aEliminar ? `¿Eliminar el crédito de "${aEliminar.nombre_cliente}"? Se borrarán también sus pagos.` : ''}
        confirmLabel="Eliminar" danger loading={eliminar.isPending}
        onConfirm={() => aEliminar && eliminar.mutate(aEliminar.id)} />
    </>
  )
}
