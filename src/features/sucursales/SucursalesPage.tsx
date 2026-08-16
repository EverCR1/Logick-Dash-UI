import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, Eye, Pencil, Trash2, Phone, MapPin, Clock, Ban, CheckCircle2, X, List, LayoutGrid } from 'lucide-react'
import { I } from '@/components/icons'
import { Select } from '@/components/ui/Select'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pagination } from '@/components/ui/Pagination'
import { BuscadorToolbar } from '@/components/ui/BuscadorToolbar'
import { SucursalForm } from './SucursalForm'
import { sucursalesApi } from '@/lib/api'
import { useDebounce, useAutoPageSize } from '@/lib/hooks'
import { inicialesNombre } from '@/lib/text'
import type { Sucursal, SucursalFiltros } from '@/types/sucursal'

const PER_PAGE = 15

type Vista = 'tabla' | 'cards'

export default function SucursalesPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const searchDebounced = useDebounce(search)
  const [estado, setEstado] = useState('todos')
  const [vista, setVista] = useState<Vista>(() => (localStorage.getItem('sucursales_vista') as Vista) || 'tabla')
  const [page, setPage] = useState(1)
  const [aEliminar, setAEliminar] = useState<Sucursal | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editar, setEditar] = useState<Sucursal | null>(null)

  useEffect(() => { localStorage.setItem('sucursales_vista', vista) }, [vista])

  const { ref: cardsRef, perPage: autoPerPage } = useAutoPageSize({ rows: 4 })
  const perPage = vista === 'cards' ? autoPerPage : PER_PAGE
  useEffect(() => { setPage(1) }, [perPage])

  const filtros: SucursalFiltros = { search: searchDebounced || undefined, estado: estado !== 'todos' ? estado : undefined, page, per_page: perPage }

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
  // El boton "Limpiar" solo aparece con 2+ filtros: con uno solo se quita
  // directamente desde su propio control (la X del buscador o volver a "todos").
  const filtrosActivos = [!!search, estado !== 'todos'].filter(Boolean).length
  const hayFiltros = filtrosActivos >= 2
  const limpiarFiltros = () => { setSearch(''); setEstado('todos'); setPage(1) }

  const abrirEditar = (s: Sucursal) => { setEditar(s); setFormOpen(true) }
  const toggle = (s: Sucursal) => cambiarEstado.mutate({ id: s.id, estado: s.estado === 'activo' ? 'inactivo' : 'activo' })

  return (
    <>
      <PageHeader title="Sucursales" subtitle="Tus puntos de venta y bodegas"
        action={<button className="btn btn-primary" onClick={() => { setEditar(null); setFormOpen(true) }}><I.Plus /> Nueva sucursal</button>} />

      <div className="toolbar">
        <BuscadorToolbar placeholder="Buscar por nombre, municipio, departamento…" value={search} onChange={(v) => { setSearch(v); setPage(1) }} cargando={isFetching} />
        <Select value={estado} onValueChange={(v) => { setEstado(v); setPage(1) }} ariaLabel="Estado"
          options={[{ value: 'todos', label: 'Todos los estados' }, { value: 'activo', label: 'Activas' }, { value: 'inactivo', label: 'Inactivas' }]} />
        {hayFiltros && <button className="btn" onClick={limpiarFiltros} title="Limpiar filtros"><X size={15} /> Limpiar</button>}
        <div className="view-toggle">
          <button data-on={vista === 'tabla'} onClick={() => setVista('tabla')} title="Vista de tabla"><List /></button>
          <button data-on={vista === 'cards'} onClick={() => setVista('cards')} title="Vista de tarjetas"><LayoutGrid /></button>
        </div>
      </div>

      {isLoading ? (
        <div className="card"><div className="empty" style={{ padding: 80 }}><Loader2 size={26} className="spin" style={{ color: 'var(--accent)' }} /><div>Cargando…</div></div></div>
      ) : isError ? (
        <div className="card"><div className="empty" style={{ padding: 80 }}><I.AlertCircle /><div>No se pudieron cargar las sucursales</div>
          <button className="btn" style={{ marginTop: 10 }} onClick={() => refetch()}><I.Refresh /> Reintentar</button></div></div>
      ) : sucursales.length === 0 ? (
        <div className="card"><div className="empty" style={{ padding: 80 }}><I.Building /><div>No se encontraron sucursales</div></div></div>
      ) : vista === 'cards' ? (
        <>
          <div className="ccards" ref={cardsRef}>
            {sucursales.map((s) => (
              <SucursalCard key={s.id} sucursal={s}
                onVer={() => navigate(`/sucursales/${s.id}`)} onEditar={() => abrirEditar(s)}
                onToggle={() => toggle(s)} onEliminar={() => setAEliminar(s)} />
            ))}
          </div>
          {meta && meta.last_page > 1 && <div className="card"><Pagination meta={meta} page={page} setPage={setPage} /></div>}
        </>
      ) : (
        <div className="card">
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
                      <SucursalAcciones activo={activo} onVer={() => navigate(`/sucursales/${s.id}`)} onEditar={() => abrirEditar(s)} onToggle={() => toggle(s)} onEliminar={() => setAEliminar(s)} />
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
        title="Eliminar sucursal" description={aEliminar ? `¿Eliminar "${aEliminar.nombre}"?` : ''}
        confirmLabel="Eliminar" danger loading={eliminar.isPending}
        onConfirm={() => aEliminar && eliminar.mutate(aEliminar.id)} />

      <SucursalForm open={formOpen} onClose={() => setFormOpen(false)} sucursal={editar} />
    </>
  )
}

// ── Acciones compartidas (tabla y card) ───────────────────────────────────────

function SucursalAcciones({ activo, onVer, onEditar, onToggle, onEliminar }: {
  activo: boolean; onVer: () => void; onEditar: () => void; onToggle: () => void; onEliminar: () => void
}) {
  return (
    <div className="row-actions">
      <button className="icon-action" data-variant="view" title="Ver detalle" onClick={onVer}><Eye /></button>
      <button className="icon-action" data-variant="edit" title="Editar" onClick={onEditar}><Pencil /></button>
      {activo
        ? <button className="icon-action" data-variant="toggle" title="Desactivar" onClick={onToggle}><Ban /></button>
        : <button className="icon-action" data-variant="activate" title="Activar" onClick={onToggle}><CheckCircle2 /></button>}
      <button className="icon-action" data-variant="delete" title="Eliminar" onClick={onEliminar}><Trash2 /></button>
    </div>
  )
}

// ── Tarjeta de sucursal ───────────────────────────────────────────────────────

function SucursalCard({ sucursal: s, onVer, onEditar, onToggle, onEliminar }: {
  sucursal: Sucursal; onVer: () => void; onEditar: () => void; onToggle: () => void; onEliminar: () => void
}) {
  const activo = s.estado === 'activo'
  const ubicacion = [s.municipio, s.departamento].filter(Boolean).join(', ')
  return (
    <div className="ccard" onClick={onVer}>
      <div className="ccard-top">
        <div className="ccard-avatar">{inicialesNombre(s.nombre)}</div>
        <div className="ccard-id">
          <div className="ccard-name">{s.nombre}</div>
          <div className="ccard-nit">{s.telefono || 'Sin teléfono'}</div>
        </div>
        <span className="badge" data-tone={activo ? 'pos' : undefined}><span className="b-dot" />{activo ? 'Activa' : 'Inactiva'}</span>
      </div>

      <div className="ccard-contact">
        <div className="cc-row"><MapPin /><span className={ubicacion ? '' : 'faint'}>{ubicacion || 'Sin ubicación'}</span></div>
        <div className="cc-row"><Clock /><span className={s.horario ? '' : 'faint'}>{s.horario || 'Sin horario'}</span></div>
      </div>

      <div className="ccard-foot" onClick={(e) => e.stopPropagation()}>
        <span className="badge">{s.municipio || 'Sucursal'}</span>
        <SucursalAcciones activo={activo} onVer={onVer} onEditar={onEditar} onToggle={onToggle} onEliminar={onEliminar} />
      </div>
    </div>
  )
}
