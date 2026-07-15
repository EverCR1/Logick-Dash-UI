import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, Eye, Pencil, Trash2, Mail, Phone, Ban, CheckCircle2, X, List, LayoutGrid, User, Building2 } from 'lucide-react'
import { I } from '@/components/icons'
import { Select } from '@/components/ui/Select'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pagination } from '@/components/ui/Pagination'
import { ClienteForm } from './ClienteForm'
import { clientesApi } from '@/lib/api'
import { useDebounce, useAutoPageSize } from '@/lib/hooks'
import { fmtN } from '@/lib/format'
import { inicialesNombre } from '@/lib/text'
import type { Cliente, ClienteFiltros } from '@/types/cliente'

const PER_PAGE = 15

type Vista = 'tabla' | 'cards'

export default function ClientesPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const searchDebounced = useDebounce(search)
  const [estado, setEstado] = useState('todos')
  const [tipo, setTipo] = useState('todos')
  const [vista, setVista] = useState<Vista>(() => (localStorage.getItem('clientes_vista') as Vista) || 'tabla')
  const [page, setPage] = useState(1)

  useEffect(() => { localStorage.setItem('clientes_vista', vista) }, [vista])
  const [aEliminar, setAEliminar] = useState<Cliente | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editar, setEditar] = useState<Cliente | null>(null)

  const { ref: cardsRef, perPage: autoPerPage } = useAutoPageSize({ rows: 4 })
  const perPage = vista === 'cards' ? autoPerPage : PER_PAGE
  useEffect(() => { setPage(1) }, [perPage])

  const filtros: ClienteFiltros = {
    search: searchDebounced || undefined,
    estado: estado !== 'todos' ? estado : undefined,
    tipo: tipo !== 'todos' ? tipo : undefined,
    page,
    per_page: perPage,
  }

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['clientes', filtros],
    queryFn: () => clientesApi.listar(filtros),
    placeholderData: keepPreviousData,
  })

  const eliminar = useMutation({
    mutationFn: (id: number) => clientesApi.eliminar(id),
    onSuccess: () => {
      toast.success('Cliente eliminado')
      setAEliminar(null)
      queryClient.invalidateQueries({ queryKey: ['clientes'] })
    },
    onError: () => toast.error('No se pudo eliminar el cliente'),
  })

  const cambiarEstado = useMutation({
    mutationFn: (id: number) => clientesApi.cambiarEstado(id),
    onSuccess: () => {
      toast.success('Estado actualizado')
      queryClient.invalidateQueries({ queryKey: ['clientes'] })
    },
    onError: () => toast.error('No se pudo cambiar el estado'),
  })

  const clientes = data?.clientes.data ?? []
  const counts = data?.counts
  const meta = data?.clientes
  const hayFiltros = !!search || estado !== 'todos' || tipo !== 'todos'
  const limpiarFiltros = () => { setSearch(''); setEstado('todos'); setTipo('todos'); setPage(1) }

  const abrirNuevo = () => { setEditar(null); setFormOpen(true) }
  const abrirEditar = (c: Cliente) => { setEditar(c); setFormOpen(true) }

  return (
    <>
      <PageHeader
        title="Clientes"
        subtitle="Administra tu base de clientes"
        action={<button className="btn btn-primary" onClick={abrirNuevo}><I.Plus /> Nuevo cliente</button>}
      />

      {counts && (
        <div className="kpi-grid">
          {[
            { label: 'Activos', value: counts.activos, icon: CheckCircle2, tone: 'pos' as const, sub: 'clientes habilitados' },
            { label: 'Inactivos', value: counts.inactivos, icon: Ban, tone: 'neg' as const, sub: 'deshabilitados' },
            { label: 'Naturales', value: counts.naturales, icon: User, tone: 'info' as const, sub: 'personas' },
            { label: 'Jurídicos', value: counts.juridicos, icon: Building2, tone: 'violet' as const, sub: 'empresas' },
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
          <input placeholder="Buscar por nombre, NIT, correo, teléfono…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
          {isFetching && <Loader2 size={14} className="spin" style={{ color: 'var(--text-faint)' }} />}
        </div>
        <Select value={estado} onValueChange={(v) => { setEstado(v); setPage(1) }} ariaLabel="Estado"
          options={[{ value: 'todos', label: 'Todos los estados' }, { value: 'activo', label: 'Activos' }, { value: 'inactivo', label: 'Inactivos' }]} />
        <Select value={tipo} onValueChange={(v) => { setTipo(v); setPage(1) }} ariaLabel="Tipo"
          options={[{ value: 'todos', label: 'Todos los tipos' }, { value: 'natural', label: 'Natural' }, { value: 'juridico', label: 'Jurídico' }]} />
        {hayFiltros && <button className="btn" onClick={limpiarFiltros} title="Limpiar filtros"><X size={15} /> Limpiar</button>}
        <div className="view-toggle">
          <button data-on={vista === 'tabla'} onClick={() => setVista('tabla')} title="Vista de tabla"><List /></button>
          <button data-on={vista === 'cards'} onClick={() => setVista('cards')} title="Vista de tarjetas"><LayoutGrid /></button>
        </div>
      </div>

      {isLoading ? (
        <div className="card"><div className="empty" style={{ padding: 80 }}><Loader2 size={26} className="spin" style={{ color: 'var(--accent)' }} /><div>Cargando clientes…</div></div></div>
      ) : isError ? (
        <div className="card"><div className="empty" style={{ padding: 80 }}><I.AlertCircle /><div>No se pudieron cargar los clientes</div>
          <button className="btn" style={{ marginTop: 10 }} onClick={() => refetch()}><I.Refresh /> Reintentar</button></div></div>
      ) : clientes.length === 0 ? (
        <div className="card"><div className="empty" style={{ padding: 80 }}><I.UserCircle /><div>No se encontraron clientes con esos filtros</div></div></div>
      ) : vista === 'cards' ? (
        <>
          <div className="ccards" ref={cardsRef}>
            {clientes.map((c) => (
              <ClienteCard key={c.id} cliente={c}
                onVer={() => navigate(`/clientes/${c.id}`)} onEditar={() => abrirEditar(c)}
                onToggle={() => cambiarEstado.mutate(c.id)} onEliminar={() => setAEliminar(c)} />
            ))}
          </div>
          {meta && meta.last_page > 1 && <div className="card"><Pagination meta={meta} page={page} setPage={setPage} /></div>}
        </>
      ) : (
        <div className="card">
          <table className="tbl">
            <thead>
              <tr>
                <th className="num" style={{ width: 48 }}>No.</th>
                <th>Cliente</th><th>Contacto</th><th>Tipo</th><th>Estado</th>
                <th style={{ width: 140, textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((c, i) => {
                const activo = c.estado === 'activo'
                return (
                  <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/clientes/${c.id}`)}>
                    <td className="num muted tnum">{(meta?.from ?? 1) + i}</td>
                    <td>
                      <div className="user-cell">
                        <div className="ua">{inicialesNombre(c.nombre)}</div>
                        <div>
                          <div className="un">{c.nombre}</div>
                          <div className="uh">{c.nit ? `NIT: ${c.nit}` : 'C/F'}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="contact-cell">
                        {c.email ? <div className="ce"><Mail />{c.email}</div> : <div className="ce" style={{ color: 'var(--text-faint)' }}>Sin correo</div>}
                        {c.telefono
                          ? <div className="cp"><Phone />{c.telefono}</div>
                          : <div className="cp" style={{ color: 'var(--text-faint)' }}>Sin teléfono</div>}
                      </div>
                    </td>
                    <td><span className="badge" data-tone={c.tipo === 'juridico' ? 'info' : undefined}>{c.tipo === 'natural' ? 'Natural' : 'Jurídico'}</span></td>
                    <td><span className="badge" data-tone={activo ? 'pos' : undefined}><span className="b-dot" />{activo ? 'Activo' : 'Inactivo'}</span></td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <ClienteAcciones activo={activo} onVer={() => navigate(`/clientes/${c.id}`)} onEditar={() => abrirEditar(c)} onToggle={() => cambiarEstado.mutate(c.id)} onEliminar={() => setAEliminar(c)} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {meta && <Pagination meta={meta} page={page} setPage={setPage} />}
        </div>
      )}

      <ConfirmDialog
        open={!!aEliminar}
        onOpenChange={(o) => !o && setAEliminar(null)}
        title="Eliminar cliente"
        description={aEliminar ? `¿Eliminar a "${aEliminar.nombre}"? Si tiene ventas asociadas, se marcará como inactivo.` : ''}
        confirmLabel="Eliminar"
        danger
        loading={eliminar.isPending}
        onConfirm={() => aEliminar && eliminar.mutate(aEliminar.id)}
      />

      <ClienteForm open={formOpen} onClose={() => setFormOpen(false)} cliente={editar} />
    </>
  )
}

// ── Acciones compartidas (tabla y card) ───────────────────────────────────────

function ClienteAcciones({ activo, onVer, onEditar, onToggle, onEliminar }: {
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

// ── Tarjeta de cliente ────────────────────────────────────────────────────────

function ClienteCard({ cliente: c, onVer, onEditar, onToggle, onEliminar }: {
  cliente: Cliente; onVer: () => void; onEditar: () => void; onToggle: () => void; onEliminar: () => void
}) {
  const activo = c.estado === 'activo'
  return (
    <div className="ccard" onClick={onVer}>
      <div className="ccard-top">
        <div className="ccard-avatar">{inicialesNombre(c.nombre)}</div>
        <div className="ccard-id">
          <div className="ccard-name">{c.nombre}</div>
          <div className="ccard-nit">{c.nit ? `NIT: ${c.nit}` : 'C/F'}</div>
        </div>
        <span className="badge" data-tone={activo ? 'pos' : undefined}><span className="b-dot" />{activo ? 'Activo' : 'Inactivo'}</span>
      </div>

      <div className="ccard-contact">
        <div className="cc-row">
          <Mail />
          <span className={c.email ? '' : 'faint'}>{c.email || 'Sin correo'}</span>
        </div>
        <div className="cc-row">
          <Phone />
          <span className={c.telefono ? '' : 'faint'}>{c.telefono || 'Sin teléfono'}</span>
        </div>
      </div>

      <div className="ccard-foot" onClick={(e) => e.stopPropagation()}>
        <span className="badge" data-tone={c.tipo === 'juridico' ? 'info' : undefined}>{c.tipo === 'natural' ? 'Natural' : 'Jurídico'}</span>
        <ClienteAcciones activo={activo} onVer={onVer} onEditar={onEditar} onToggle={onToggle} onEliminar={onEliminar} />
      </div>
    </div>
  )
}
