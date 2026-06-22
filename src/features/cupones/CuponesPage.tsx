import { useState } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, Pencil, Trash2, Ban, CheckCircle2, X, Ticket, CheckCircle } from 'lucide-react'
import { I } from '@/components/icons'
import { Select } from '@/components/ui/Select'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pagination } from '@/components/ui/Pagination'
import { CuponForm } from './CuponForm'
import { cuponesApi } from '@/lib/api'
import { useDebounce } from '@/lib/hooks'
import { q, fmtN } from '@/lib/format'
import type { Cupon, CuponFiltros } from '@/types/cupon'

const PER_PAGE = 15

export default function CuponesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const searchDebounced = useDebounce(search)
  const [estado, setEstado] = useState('todos')
  const [page, setPage] = useState(1)
  const [aEliminar, setAEliminar] = useState<Cupon | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editar, setEditar] = useState<Cupon | null>(null)

  const filtros: CuponFiltros = { search: searchDebounced || undefined, estado: estado !== 'todos' ? estado : undefined, page, per_page: PER_PAGE }

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

  const valorCupon = (c: Cupon) => c.tipo === 'porcentaje' ? `${c.valor}%` : q(c.valor)

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
      </div>

      <div className="card">
        {isLoading ? (
          <div className="empty" style={{ padding: 80 }}><Loader2 size={26} className="spin" style={{ color: 'var(--accent)' }} /><div>Cargando…</div></div>
        ) : isError ? (
          <div className="empty" style={{ padding: 80 }}><I.AlertCircle /><div>No se pudieron cargar los cupones</div>
            <button className="btn" style={{ marginTop: 10 }} onClick={() => refetch()}><I.Refresh /> Reintentar</button></div>
        ) : cupones.length === 0 ? (
          <div className="empty" style={{ padding: 80 }}><I.Ticket /><div>No se encontraron cupones</div></div>
        ) : (
          <>
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
                        <div className="row-actions">
                          <button className="icon-action" data-variant="edit" title="Editar" onClick={() => { setEditar(c); setFormOpen(true) }}><Pencil /></button>
                          {activo
                            ? <button className="icon-action" data-variant="toggle" title="Desactivar" onClick={() => toggleEstado.mutate(c.id)}><Ban /></button>
                            : <button className="icon-action" data-variant="activate" title="Activar" onClick={() => toggleEstado.mutate(c.id)}><CheckCircle2 /></button>}
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

      <ConfirmDialog open={!!aEliminar} onOpenChange={(o) => !o && setAEliminar(null)}
        title="Eliminar cupón" description={aEliminar ? `¿Eliminar el cupón "${aEliminar.codigo}"?` : ''}
        confirmLabel="Eliminar" danger loading={eliminar.isPending}
        onConfirm={() => aEliminar && eliminar.mutate(aEliminar.id)} />

      <CuponForm open={formOpen} onClose={() => setFormOpen(false)} cupon={editar} />
    </>
  )
}
