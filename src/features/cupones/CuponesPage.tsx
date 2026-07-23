import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, Pencil, Trash2, Ban, CheckCircle2, X, Ticket, CheckCircle, List, LayoutGrid } from 'lucide-react'
import { I } from '@/components/icons'
import { Select } from '@/components/ui/Select'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pagination } from '@/components/ui/Pagination'
import { CuponForm } from './CuponForm'
import { cuponesApi } from '@/lib/api'
import { useDebounce, useAutoPageSize, vistaInicial } from '@/lib/hooks'
import { q, fmtN } from '@/lib/format'
import type { Cupon, CuponFiltros } from '@/types/cupon'

const PER_PAGE = 15

type Vista = 'tabla' | 'cards'

const valorCupon = (c: Cupon) => c.tipo === 'porcentaje' ? `${c.valor}%` : q(c.valor)

export default function CuponesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const searchDebounced = useDebounce(search)
  const [estado, setEstado] = useState('todos')
  const [vista, setVista] = useState<Vista>(() => vistaInicial('cupones_vista'))
  const [page, setPage] = useState(1)
  const [aEliminar, setAEliminar] = useState<Cupon | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editar, setEditar] = useState<Cupon | null>(null)

  useEffect(() => { localStorage.setItem('cupones_vista', vista) }, [vista])

  const { ref: cardsRef, perPage: autoPerPage } = useAutoPageSize({ rows: 4 })
  const perPage = vista === 'cards' ? autoPerPage : PER_PAGE
  useEffect(() => { setPage(1) }, [perPage])

  const filtros: CuponFiltros = { search: searchDebounced || undefined, estado: estado !== 'todos' ? estado : undefined, page, per_page: perPage }

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['cupones', filtros],
    queryFn: () => cuponesApi.listar(filtros),
    placeholderData: keepPreviousData,
  })

  const eliminar = useMutation({
    mutationFn: (id: number) => cuponesApi.eliminar(id),
    onSuccess: () => { toast.success('Cupón eliminado'); setAEliminar(null); queryClient.invalidateQueries({ queryKey: ['cupones'] }) },
    onError: () => toast.error('No se pudo eliminar el cupón'),
  })
  const toggleEstado = useMutation({
    mutationFn: (id: number) => cuponesApi.toggleEstado(id),
    onSuccess: () => { toast.success('Estado actualizado'); queryClient.invalidateQueries({ queryKey: ['cupones'] }) },
    onError: () => toast.error('No se pudo cambiar el estado'),
  })

  const cupones = data?.cupones.data ?? []
  const counts = data?.counts
  const meta = data?.cupones
  const hayFiltros = !!search || estado !== 'todos'
  const limpiarFiltros = () => { setSearch(''); setEstado('todos'); setPage(1) }

  const abrirEditar = (c: Cupon) => { setEditar(c); setFormOpen(true) }

  return (
    <>
      <PageHeader title="Cupones" subtitle="Promociones y descuentos de la tienda"
        action={<button className="btn btn-primary" onClick={() => { setEditar(null); setFormOpen(true) }}><I.Plus /> Nuevo cupón</button>} />

      {counts && (
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          {[
            { label: 'Total', value: counts.total, icon: Ticket, tone: 'accent' as const, sub: 'cupones' },
            { label: 'Activos', value: counts.activos, icon: CheckCircle, tone: 'pos' as const, sub: 'vigentes' },
            { label: 'Inactivos', value: counts.inactivos, icon: Ban, tone: 'neg' as const, sub: 'deshabilitados' },
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
          <input placeholder="Buscar por código…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
          {isFetching && <Loader2 size={14} className="spin" style={{ color: 'var(--text-faint)' }} />}
        </div>
        <Select value={estado} onValueChange={(v) => { setEstado(v); setPage(1) }} ariaLabel="Estado"
          options={[{ value: 'todos', label: 'Todos los estados' }, { value: 'activo', label: 'Activos' }, { value: 'inactivo', label: 'Inactivos' }]} />
        {hayFiltros && <button className="btn" onClick={limpiarFiltros} title="Limpiar filtros"><X size={15} /> Limpiar</button>}
        <div className="view-toggle">
          <button data-on={vista === 'tabla'} onClick={() => setVista('tabla')} title="Vista de tabla"><List /></button>
          <button data-on={vista === 'cards'} onClick={() => setVista('cards')} title="Vista de tarjetas"><LayoutGrid /></button>
        </div>
      </div>

      {isLoading ? (
        <div className="card"><div className="empty" style={{ padding: 80 }}><Loader2 size={26} className="spin" style={{ color: 'var(--accent)' }} /><div>Cargando…</div></div></div>
      ) : isError ? (
        <div className="card"><div className="empty" style={{ padding: 80 }}><I.AlertCircle /><div>No se pudieron cargar los cupones</div>
          <button className="btn" style={{ marginTop: 10 }} onClick={() => refetch()}><I.Refresh /> Reintentar</button></div></div>
      ) : cupones.length === 0 ? (
        <div className="card"><div className="empty" style={{ padding: 80 }}><I.Ticket /><div>No se encontraron cupones</div></div></div>
      ) : vista === 'cards' ? (
        <>
          <div className="ccards" ref={cardsRef}>
            {cupones.map((c) => (
              <CuponCard key={c.id} cupon={c}
                onEditar={() => abrirEditar(c)} onToggle={() => toggleEstado.mutate(c.id)} onEliminar={() => setAEliminar(c)} />
            ))}
          </div>
          {meta && meta.last_page > 1 && <div className="card"><Pagination meta={meta} page={page} setPage={setPage} /></div>}
        </>
      ) : (
        <div className="card">
          <table className="tbl">
            <thead><tr><th className="num" style={{ width: 48 }}>No.</th><th>Código</th><th className="num">Valor</th><th className="num">Usos</th><th>Vence</th><th>Estado</th><th style={{ width: 110, textAlign: 'right' }}>Acciones</th></tr></thead>
            <tbody>
              {cupones.map((c, i) => {
                const activo = c.estado === 'activo'
                return (
                  <tr key={c.id}>
                    <td className="num muted tnum">{(meta?.from ?? 1) + i}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{c.codigo}</div>
                      {c.descripcion && <div className="muted" style={{ fontSize: 11.5, marginTop: 1 }}>{c.descripcion}</div>}
                    </td>
                    <td className="num tnum" style={{ fontWeight: 600 }}>{valorCupon(c)}</td>
                    <td className="num tnum muted">{c.usos_actuales}{c.usos_maximos ? ` / ${c.usos_maximos}` : ''}</td>
                    <td className="muted">{c.fecha_vencimiento ? c.fecha_vencimiento.slice(0, 10) : 'Sin límite'}</td>
                    <td><span className="badge" data-tone={activo ? 'pos' : undefined}><span className="b-dot" />{activo ? 'Activo' : 'Inactivo'}</span></td>
                    <td>
                      <CuponAcciones activo={activo} onEditar={() => abrirEditar(c)} onToggle={() => toggleEstado.mutate(c.id)} onEliminar={() => setAEliminar(c)} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {meta && <Pagination meta={meta} page={page} setPage={setPage} />}
        </div>
      )}

      <ConfirmDialog open={!!aEliminar} onOpenChange={(o) => !o && setAEliminar(null)}
        title="Eliminar cupón" description={aEliminar ? `¿Eliminar el cupón "${aEliminar.codigo}"?` : ''}
        confirmLabel="Eliminar" danger loading={eliminar.isPending}
        onConfirm={() => aEliminar && eliminar.mutate(aEliminar.id)} />

      <CuponForm open={formOpen} onClose={() => setFormOpen(false)} cupon={editar} />
    </>
  )
}

// ── Acciones compartidas (tabla y card) ───────────────────────────────────────

function CuponAcciones({ activo, onEditar, onToggle, onEliminar }: {
  activo: boolean; onEditar: () => void; onToggle: () => void; onEliminar: () => void
}) {
  return (
    <div className="row-actions">
      <button className="icon-action" data-variant="edit" title="Editar" onClick={onEditar}><Pencil /></button>
      {activo
        ? <button className="icon-action" data-variant="toggle" title="Desactivar" onClick={onToggle}><Ban /></button>
        : <button className="icon-action" data-variant="activate" title="Activar" onClick={onToggle}><CheckCircle2 /></button>}
      <button className="icon-action" data-variant="delete" title="Eliminar" onClick={onEliminar}><Trash2 /></button>
    </div>
  )
}

// ── Tarjeta de cupón ──────────────────────────────────────────────────────────

function CuponCard({ cupon: c, onEditar, onToggle, onEliminar }: {
  cupon: Cupon; onEditar: () => void; onToggle: () => void; onEliminar: () => void
}) {
  const activo = c.estado === 'activo'
  return (
    <div className="ccard static">
      <div className="rc-head">
        <div style={{ minWidth: 0 }}>
          <div className="rc-title" style={{ fontFamily: 'monospace', letterSpacing: '0.02em' }}>{c.codigo}</div>
          {c.descripcion && <div className="rc-sub">{c.descripcion}</div>}
        </div>
        <span className="badge" data-tone={activo ? 'pos' : undefined}><span className="b-dot" />{activo ? 'Activo' : 'Inactivo'}</span>
      </div>

      <div className="rc-body">
        <div className="rc-line"><span className="lbl">Valor</span><span className="val tnum">{valorCupon(c)}</span></div>
        <div className="rc-line"><span className="lbl">Usos</span><span className="val tnum">{c.usos_actuales}{c.usos_maximos ? ` / ${c.usos_maximos}` : ''}</span></div>
        <div className="rc-line"><span className="lbl">Vence</span><span className="val">{c.fecha_vencimiento ? c.fecha_vencimiento.slice(0, 10) : 'Sin límite'}</span></div>
      </div>

      <div className="rc-foot">
        <span className="rc-who">{c.tipo === 'porcentaje' ? 'Porcentaje' : 'Monto fijo'}</span>
        <CuponAcciones activo={activo} onEditar={onEditar} onToggle={onToggle} onEliminar={onEliminar} />
      </div>
    </div>
  )
}
