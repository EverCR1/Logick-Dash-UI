import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, Eye, Pencil, Trash2, Phone, MapPin, Clock, Ban, CheckCircle2, X } from 'lucide-react'
import { I } from '@/components/icons'
import { Select } from '@/components/ui/Select'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pagination } from '@/components/ui/Pagination'
import { SucursalForm } from './SucursalForm'
import { sucursalesApi } from '@/lib/api'
import { useDebounce } from '@/lib/hooks'
import { inicialesNombre } from '@/lib/text'
import type { Sucursal, SucursalFiltros } from '@/types/sucursal'

const PER_PAGE = 15

export default function SucursalesPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const searchDebounced = useDebounce(search)
  const [estado, setEstado] = useState('todos')
  const [page, setPage] = useState(1)
  const [aEliminar, setAEliminar] = useState<Sucursal | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editar, setEditar] = useState<Sucursal | null>(null)

  const filtros: SucursalFiltros = { search: searchDebounced || undefined, estado: estado !== 'todos' ? estado : undefined, page, per_page: PER_PAGE }

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['sucursales', filtros],
    queryFn: () => sucursalesApi.listar(filtros),
    placeholderData: keepPreviousData,
  })

  const eliminar = useMutation({
    mutationFn: (id: number) => sucursalesApi.eliminar(id),
    onSuccess: () => { toast.success('Sucursal eliminada'); setAEliminar(null); queryClient.invalidateQueries({ queryKey: ['sucursales'] }) },
    onError: () => toast.error('No se pudo eliminar la sucursal'),
  })
  const cambiarEstado = useMutation({
    mutationFn: ({ id, estado }: { id: number; estado: 'activo' | 'inactivo' }) => sucursalesApi.cambiarEstado(id, estado),
    onSuccess: () => { toast.success('Estado actualizado'); queryClient.invalidateQueries({ queryKey: ['sucursales'] }) },
    onError: () => toast.error('No se pudo cambiar el estado'),
  })

  const sucursales = data?.sucursales.data ?? []
  const meta = data?.sucursales
  const hayFiltros = !!search || estado !== 'todos'
  const limpiarFiltros = () => { setSearch(''); setEstado('todos'); setPage(1) }

  return (
    <>
      <PageHeader title="Sucursales" subtitle="Tus puntos de venta y bodegas"
        action={<button className="btn btn-primary" onClick={() => { setEditar(null); setFormOpen(true) }}><I.Plus /> Nueva sucursal</button>} />

      <div className="toolbar">
        <div className="toolbar-search">
          <I.Search />
          <input placeholder="Buscar por nombre, municipio, departamento…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
          {isFetching && <Loader2 size={14} className="spin" style={{ color: 'var(--text-faint)' }} />}
        </div>
        <Select value={estado} onValueChange={(v) => { setEstado(v); setPage(1) }} ariaLabel="Estado"
          options={[{ value: 'todos', label: 'Todos los estados' }, { value: 'activo', label: 'Activas' }, { value: 'inactivo', label: 'Inactivas' }]} />
        {hayFiltros && <button className="btn" onClick={limpiarFiltros} title="Limpiar filtros"><X size={15} /> Limpiar</button>}
      </div>

      <div className="card">
        {isLoading ? (
          <div className="empty" style={{ padding: 80 }}><Loader2 size={26} className="spin" style={{ color: 'var(--accent)' }} /><div>Cargando…</div></div>
        ) : isError ? (
          <div className="empty" style={{ padding: 80 }}><I.AlertCircle /><div>No se pudieron cargar las sucursales</div>
            <button className="btn" style={{ marginTop: 10 }} onClick={() => refetch()}><I.Refresh /> Reintentar</button></div>
        ) : sucursales.length === 0 ? (
          <div className="empty" style={{ padding: 80 }}><I.Building /><div>No se encontraron sucursales</div></div>
        ) : (
          <>
            <table className="tbl">
              <thead><tr><th className="num" style={{ width: 48 }}>No.</th><th>Sucursal</th><th>Ubicación</th><th>Horario</th><th>Estado</th><th style={{ width: 140, textAlign: 'right' }}>Acciones</th></tr></thead>
              <tbody>
                {sucursales.map((s, i) => {
                  const activo = s.estado === 'activo'
                  const ubicacion = [s.municipio, s.departamento].filter(Boolean).join(', ')
                  return (
                    <tr key={s.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/sucursales/${s.id}`)}>
                      <td className="num muted tnum">{(meta?.from ?? 1) + i}</td>
                      <td>
                        <div className="user-cell">
                          <div className="ua">{inicialesNombre(s.nombre)}</div>
                          <div>
                            <div className="un">{s.nombre}</div>
                            {s.telefono && <div className="uh"><Phone size={11} style={{ verticalAlign: -1, marginRight: 3 }} />{s.telefono}</div>}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="ce"><MapPin style={{ width: 13, height: 13, color: 'var(--text-faint)' }} />{ubicacion || <span className="muted">Sin ubicación</span>}</div>
                      </td>
                      <td>
                        <div className="ce"><Clock style={{ width: 13, height: 13, color: 'var(--text-faint)' }} />{s.horario ? s.horario : <span className="muted">—</span>}</div>
                      </td>
                      <td><span className="badge" data-tone={activo ? 'pos' : undefined}><span className="b-dot" />{activo ? 'Activa' : 'Inactiva'}</span></td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="row-actions">
                          <button className="icon-action" data-variant="view" title="Ver detalle" onClick={() => navigate(`/sucursales/${s.id}`)}><Eye /></button>
                          <button className="icon-action" data-variant="edit" title="Editar" onClick={() => { setEditar(s); setFormOpen(true) }}><Pencil /></button>
                          {activo
                            ? <button className="icon-action" data-variant="toggle" title="Desactivar" onClick={() => cambiarEstado.mutate({ id: s.id, estado: 'inactivo' })}><Ban /></button>
                            : <button className="icon-action" data-variant="activate" title="Activar" onClick={() => cambiarEstado.mutate({ id: s.id, estado: 'activo' })}><CheckCircle2 /></button>}
                          <button className="icon-action" data-variant="delete" title="Eliminar" onClick={() => setAEliminar(s)}><Trash2 /></button>
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
        title="Eliminar sucursal" description={aEliminar ? `¿Eliminar "${aEliminar.nombre}"?` : ''}
        confirmLabel="Eliminar" danger loading={eliminar.isPending}
        onConfirm={() => aEliminar && eliminar.mutate(aEliminar.id)} />

      <SucursalForm open={formOpen} onClose={() => setFormOpen(false)} sucursal={editar} />
    </>
  )
}
