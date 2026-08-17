import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, Eye, Pencil, Trash2, Mail, Phone, Ban, CheckCircle2, X, Truck } from 'lucide-react'
import { I } from '@/components/icons'
import { Select } from '@/components/ui/Select'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { PageHeader } from '@/components/ui/PageHeader'
import { KpiGrid } from '@/components/ui/KpiGrid'
import { Pagination } from '@/components/ui/Pagination'
import { BuscadorToolbar } from '@/components/ui/BuscadorToolbar'
import { ProveedorForm } from './ProveedorForm'
import { proveedoresApi } from '@/lib/api'
import { useDebounce } from '@/lib/hooks'
import type { Proveedor, ProveedorFiltros } from '@/types/proveedor'

const PER_PAGE = 15

export default function ProveedoresPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const searchDebounced = useDebounce(search)
  const [estado, setEstado] = useState('todos')

  // Pulsar el KPI activo lo desmarca y vuelve a "todos".
  const filtrarPor = (valor: string) => {
    setEstado((actual) => (actual === valor ? 'todos' : valor))
    setPage(1)
  }
  const [page, setPage] = useState(1)
  const [aEliminar, setAEliminar] = useState<Proveedor | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editar, setEditar] = useState<Proveedor | null>(null)

  const filtros: ProveedorFiltros = {
    search: searchDebounced || undefined,
    estado: estado !== 'todos' ? estado : undefined,
    page, per_page: PER_PAGE,
  }

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['proveedores', filtros],
    queryFn: () => proveedoresApi.listar(filtros),
    placeholderData: keepPreviousData,
  })

  const eliminar = useMutation({
    mutationFn: (id: number) => proveedoresApi.eliminar(id),
    onSuccess: () => { toast.success('Proveedor eliminado'); setAEliminar(null); queryClient.invalidateQueries({ queryKey: ['proveedores'] }) },
    onError: () => toast.error('No se pudo eliminar el proveedor'),
  })
  const cambiarEstado = useMutation({
    mutationFn: ({ id, estado }: { id: number; estado: 'activo' | 'inactivo' }) => proveedoresApi.cambiarEstado(id, estado),
    onSuccess: () => { toast.success('Estado actualizado'); queryClient.invalidateQueries({ queryKey: ['proveedores'] }) },
    onError: () => toast.error('No se pudo cambiar el estado'),
  })

  const proveedores = data?.proveedores.data ?? []
  const counts = data?.counts
  const meta = data?.proveedores
  // El boton "Limpiar" solo aparece con 2+ filtros: con uno solo se quita
  // directamente desde su propio control (la X del buscador o volver a "todos").
  const filtrosActivos = [!!search, estado !== 'todos'].filter(Boolean).length
  const hayFiltros = filtrosActivos >= 2
  const limpiarFiltros = () => { setSearch(''); setEstado('todos'); setPage(1) }

  return (
    <>
      <PageHeader title="Proveedores" subtitle="Gestiona tus proveedores"
        action={<button className="btn btn-primary" onClick={() => { setEditar(null); setFormOpen(true) }}><I.Plus /> Nuevo proveedor</button>} />

      {counts && (

        <KpiGrid items={[
          { label: 'Total', value: counts.activos + counts.inactivos, icon: Truck, tone: 'accent', sub: 'proveedores registrados', onClick: () => filtrarPor('todos'), activo: estado === 'todos' },
          { label: 'Activos', value: counts.activos, icon: CheckCircle2, tone: 'pos', sub: 'disponibles', onClick: () => filtrarPor('activo'), activo: estado === 'activo' },
          { label: 'Inactivos', value: counts.inactivos, icon: Ban, tone: 'neg', sub: 'deshabilitados', onClick: () => filtrarPor('inactivo'), activo: estado === 'inactivo' },
        ]} />
      )}

      <div className="toolbar">
        <BuscadorToolbar placeholder="Buscar proveedor…" value={search} onChange={(v) => { setSearch(v); setPage(1) }} cargando={isFetching} />
        <Select value={estado} onValueChange={(v) => { setEstado(v); setPage(1) }} ariaLabel="Estado"
          options={[{ value: 'todos', label: 'Todos los estados' }, { value: 'activo', label: 'Activos' }, { value: 'inactivo', label: 'Inactivos' }]} />
        {hayFiltros && <button className="btn" onClick={limpiarFiltros} title="Limpiar filtros"><X size={15} /> Limpiar</button>}
      </div>

      <div className="card">
        {isLoading ? (
          <div className="empty" style={{ padding: 80 }}><Loader2 size={26} className="spin" style={{ color: 'var(--accent)' }} /><div>Cargando…</div></div>
        ) : isError ? (
          <div className="empty" style={{ padding: 80 }}><I.AlertCircle /><div>No se pudieron cargar los proveedores</div>
            <button className="btn" style={{ marginTop: 10 }} onClick={() => refetch()}><I.Refresh /> Reintentar</button></div>
        ) : proveedores.length === 0 ? (
          <div className="empty" style={{ padding: 80 }}><I.Truck /><div>No se encontraron proveedores</div></div>
        ) : (
          <>
            <table className="tbl">
              <thead><tr><th className="num" style={{ width: 48 }}>No.</th><th>Proveedor</th><th>Contacto</th><th>Estado</th><th style={{ width: 140, textAlign: 'right' }}>Acciones</th></tr></thead>
              <tbody>
                {proveedores.map((p, i) => {
                  const activo = p.estado === 'activo'
                  return (
                    <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/proveedores/${p.id}`)}>
                      <td className="num muted tnum">{(meta?.from ?? 1) + i}</td>
                      <td>
                        <div className="user-cell">
                          <div className="ua"><Truck size={16} /></div>
                          <div>
                            <div className="un">{p.nombre}</div>
                            {p.descripcion && <div className="uh">{p.descripcion}</div>}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="contact-cell">
                          {p.email ? <div className="ce"><Mail />{p.email}</div> : <div className="ce" style={{ color: 'var(--text-faint)' }}>Sin correo</div>}
                          {p.telefono
                            ? <div className="cp"><Phone />{p.telefono}</div>
                            : <div className="cp" style={{ color: 'var(--text-faint)' }}>Sin teléfono</div>}
                        </div>
                      </td>
                      <td><span className="badge" data-tone={activo ? 'pos' : undefined}><span className="b-dot" />{activo ? 'Activo' : 'Inactivo'}</span></td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="row-actions">
                          <button className="icon-action" data-variant="view" title="Ver detalle" onClick={() => navigate(`/proveedores/${p.id}`)}><Eye /></button>
                          <button className="icon-action" data-variant="edit" title="Editar" onClick={() => { setEditar(p); setFormOpen(true) }}><Pencil /></button>
                          {activo
                            ? <button className="icon-action" data-variant="toggle" title="Desactivar" onClick={() => cambiarEstado.mutate({ id: p.id, estado: 'inactivo' })}><Ban /></button>
                            : <button className="icon-action" data-variant="activate" title="Activar" onClick={() => cambiarEstado.mutate({ id: p.id, estado: 'activo' })}><CheckCircle2 /></button>}
                          <button className="icon-action" data-variant="delete" title="Eliminar" onClick={() => setAEliminar(p)}><Trash2 /></button>
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
        title="Eliminar proveedor" description={aEliminar ? `¿Eliminar "${aEliminar.nombre}"?` : ''}
        confirmLabel="Eliminar" danger loading={eliminar.isPending}
        onConfirm={() => aEliminar && eliminar.mutate(aEliminar.id)} />

      <ProveedorForm open={formOpen} onClose={() => setFormOpen(false)} proveedor={editar} />
    </>
  )
}
