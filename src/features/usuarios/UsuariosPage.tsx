import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, Eye, Pencil, Trash2, Mail, Phone, Ban, CheckCircle2, X } from 'lucide-react'
import { I } from '@/components/icons'
import { Select } from '@/components/ui/Select'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pagination } from '@/components/ui/Pagination'
import { UsuarioForm } from './UsuarioForm'
import { rolMeta, iniciales } from './usuario-meta'
import { usuariosApi } from '@/lib/api'
import { useDebounce } from '@/lib/hooks'
import type { Usuario, UsuarioFiltros } from '@/types/usuario'

const PER_PAGE = 15

export default function UsuariosPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const searchDebounced = useDebounce(search)
  const [estado, setEstado] = useState('todos')
  const [rol, setRol] = useState('todos')
  const [page, setPage] = useState(1)
  const [aEliminar, setAEliminar] = useState<Usuario | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editar, setEditar] = useState<Usuario | null>(null)

  const filtros: UsuarioFiltros = {
    search: searchDebounced || undefined,
    estado: estado !== 'todos' ? estado : undefined,
    rol: rol !== 'todos' ? rol : undefined,
    page, per_page: PER_PAGE,
  }

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['usuarios', filtros],
    queryFn: () => usuariosApi.listar(filtros),
    placeholderData: keepPreviousData,
  })

  const eliminar = useMutation({
    mutationFn: (id: number) => usuariosApi.eliminar(id),
    onSuccess: () => { toast.success('Usuario eliminado'); setAEliminar(null); queryClient.invalidateQueries({ queryKey: ['usuarios'] }) },
    onError: () => toast.error('No se pudo eliminar el usuario'),
  })
  const cambiarEstado = useMutation({
    mutationFn: ({ id, estado }: { id: number; estado: 'activo' | 'inactivo' }) => usuariosApi.cambiarEstado(id, estado),
    onSuccess: () => { toast.success('Estado actualizado'); queryClient.invalidateQueries({ queryKey: ['usuarios'] }) },
    onError: () => toast.error('No se pudo cambiar el estado'),
  })

  const usuarios = data?.users.data ?? []
  const meta = data?.users
  const hayFiltros = !!search || estado !== 'todos' || rol !== 'todos'
  const limpiarFiltros = () => { setSearch(''); setEstado('todos'); setRol('todos'); setPage(1) }

  return (
    <>
      <PageHeader title="Usuarios" subtitle={`Personal con acceso al sistema${meta ? ` · ${meta.total} en total` : ''}`}
        action={<button className="btn btn-primary" onClick={() => { setEditar(null); setFormOpen(true) }}><I.Plus /> Nuevo usuario</button>} />

      <div className="toolbar">
        <div className="toolbar-search">
          <I.Search />
          <input placeholder="Buscar por nombre, correo, usuario…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
          {isFetching && <Loader2 size={14} className="spin" style={{ color: 'var(--text-faint)' }} />}
        </div>
        <Select value={rol} onValueChange={(v) => { setRol(v); setPage(1) }} ariaLabel="Rol"
          options={[
            { value: 'todos', label: 'Todos los roles' },
            { value: 'administrador', label: 'Administrador' },
            { value: 'analista', label: 'Analista' },
            { value: 'vendedor', label: 'Vendedor' },
          ]} />
        <Select value={estado} onValueChange={(v) => { setEstado(v); setPage(1) }} ariaLabel="Estado"
          options={[{ value: 'todos', label: 'Todos los estados' }, { value: 'activo', label: 'Activos' }, { value: 'inactivo', label: 'Inactivos' }]} />
        {hayFiltros && (
          <button className="btn" onClick={limpiarFiltros} title="Limpiar filtros"><X size={15} /> Limpiar</button>
        )}
      </div>

      <div className="card">
        {isLoading ? (
          <div className="empty" style={{ padding: 80 }}><Loader2 size={26} className="spin" style={{ color: 'var(--accent)' }} /><div>Cargando…</div></div>
        ) : isError ? (
          <div className="empty" style={{ padding: 80 }}><I.AlertCircle /><div>No se pudieron cargar los usuarios</div>
            <button className="btn" style={{ marginTop: 10 }} onClick={() => refetch()}><I.Refresh /> Reintentar</button></div>
        ) : usuarios.length === 0 ? (
          <div className="empty" style={{ padding: 80 }}><I.Users /><div>No se encontraron usuarios con esos filtros</div></div>
        ) : (
          <>
            <table className="tbl">
              <thead><tr><th className="num" style={{ width: 48 }}>No.</th><th>Usuario</th><th>Contacto</th><th>Rol</th><th>Estado</th><th style={{ width: 140, textAlign: 'right' }}>Acciones</th></tr></thead>
              <tbody>
                {usuarios.map((u, i) => {
                  const activo = u.estado === 'activo'
                  const role = rolMeta(u.rol)
                  const RoleIcon = role.icon
                  return (
                    <tr key={u.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/usuarios/${u.id}`)}>
                      <td className="num muted tnum">{(meta?.from ?? 1) + i}</td>
                      <td>
                        <div className="user-cell">
                          <div className="ua">{iniciales(u.nombres, u.apellidos)}</div>
                          <div>
                            <div className="un">{u.nombres} {u.apellidos}</div>
                            <div className="uh">@{u.username}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="contact-cell">
                          <div className="ce"><Mail />{u.email}</div>
                          {u.telefono
                            ? <div className="cp"><Phone />{u.telefono}</div>
                            : <div className="cp" style={{ color: 'var(--text-faint)' }}>Sin teléfono</div>}
                        </div>
                      </td>
                      <td><span className="role-badge" data-role={role.dataRole}><RoleIcon />{role.label}</span></td>
                      <td><span className="badge" data-tone={activo ? 'pos' : undefined}><span className="b-dot" />{activo ? 'Activo' : 'Inactivo'}</span></td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="row-actions">
                          <button className="icon-action" data-variant="view" title="Ver detalle" onClick={() => navigate(`/usuarios/${u.id}`)}><Eye /></button>
                          <button className="icon-action" data-variant="edit" title="Editar" onClick={() => { setEditar(u); setFormOpen(true) }}><Pencil /></button>
                          {activo
                            ? <button className="icon-action" data-variant="toggle" title="Desactivar" onClick={() => cambiarEstado.mutate({ id: u.id, estado: 'inactivo' })}><Ban /></button>
                            : <button className="icon-action" data-variant="activate" title="Activar" onClick={() => cambiarEstado.mutate({ id: u.id, estado: 'activo' })}><CheckCircle2 /></button>}
                          <button className="icon-action" data-variant="delete" title="Eliminar" onClick={() => setAEliminar(u)}><Trash2 /></button>
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
        title="Eliminar usuario" description={aEliminar ? `¿Eliminar a "${aEliminar.nombres} ${aEliminar.apellidos}"? Esta acción no se puede deshacer.` : ''}
        confirmLabel="Eliminar" danger loading={eliminar.isPending}
        onConfirm={() => aEliminar && eliminar.mutate(aEliminar.id)} />

      <UsuarioForm open={formOpen} onClose={() => setFormOpen(false)} usuario={editar} />
    </>
  )
}
