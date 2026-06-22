import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, Eye, Pencil, Trash2, Ban, CheckCircle2, X, Boxes, CheckCircle, Tag, TrendingUp, List, LayoutGrid } from 'lucide-react'
import { I } from '@/components/icons'
import { Select } from '@/components/ui/Select'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pagination } from '@/components/ui/Pagination'
import { Lightbox } from '@/components/ui/Lightbox'
import { ServicioForm } from './ServicioForm'
import { serviciosApi } from '@/lib/api'
import { useDebounce } from '@/lib/hooks'
import { q, fmtN } from '@/lib/format'
import type { Servicio, ServicioFiltros } from '@/types/servicio'

const PER_PAGE = 15
type Vista = 'tabla' | 'cards'

function thumbDe(s: Servicio): string | undefined {
  const img = s.imagenes?.[0]
  return img?.url_thumb ?? img?.url_medium ?? img?.url ?? undefined
}

function grandeDe(s: Servicio): string | undefined {
  const img = s.imagenes?.[0]
  return img?.url ?? img?.url_medium ?? img?.url_thumb ?? undefined
}

export default function ServiciosPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const searchDebounced = useDebounce(search)
  const [estado, setEstado] = useState('todos')
  const [vista, setVista] = useState<Vista>(() => (localStorage.getItem('servicios_vista') as Vista) || 'tabla')
  const [page, setPage] = useState(1)
  const [aEliminar, setAEliminar] = useState<Servicio | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editar, setEditar] = useState<Servicio | null>(null)
  const [zoom, setZoom] = useState<string | null>(null)

  useEffect(() => { localStorage.setItem('servicios_vista', vista) }, [vista])

  const filtros: ServicioFiltros = { search: searchDebounced || undefined, estado: estado !== 'todos' ? estado : undefined, page, per_page: PER_PAGE }

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['servicios', filtros],
    queryFn: () => serviciosApi.listar(filtros),
    placeholderData: keepPreviousData,
  })

  const eliminar = useMutation({
    mutationFn: (id: number) => serviciosApi.eliminar(id),
    onSuccess: () => { toast.success('Servicio eliminado'); setAEliminar(null); queryClient.invalidateQueries({ queryKey: ['servicios'] }) },
    onError: () => toast.error('No se pudo eliminar el servicio'),
  })
  const cambiarEstado = useMutation({
    mutationFn: ({ id, estado }: { id: number; estado: 'activo' | 'inactivo' }) => serviciosApi.cambiarEstado(id, estado),
    onSuccess: () => { toast.success('Estado actualizado'); queryClient.invalidateQueries({ queryKey: ['servicios'] }) },
    onError: () => toast.error('No se pudo cambiar el estado'),
  })

  const servicios = data?.servicios.data ?? []
  const counts = data?.counts
  const meta = data?.servicios
  const hayFiltros = !!search || estado !== 'todos'
  const limpiarFiltros = () => { setSearch(''); setEstado('todos'); setPage(1) }

  return (
    <>
      <PageHeader title="Servicios" subtitle="Catálogo de servicios"
        action={<button className="btn btn-primary" onClick={() => { setEditar(null); setFormOpen(true) }}><I.Plus /> Nuevo servicio</button>} />

      {counts && (
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          {[
            { label: 'Total', value: counts.total, icon: Boxes, tone: 'accent' as const, sub: 'servicios' },
            { label: 'Activos', value: counts.activos, icon: CheckCircle, tone: 'pos' as const, sub: 'disponibles' },
            { label: 'En oferta', value: counts.en_oferta, icon: Tag, tone: 'violet' as const, sub: 'con descuento' },
            { label: 'Margen alto', value: counts.margen_alto, icon: TrendingUp, tone: 'info' as const, sub: 'buena ganancia' },
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
          <input placeholder="Buscar por código, nombre…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
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
        <div className="card"><div className="empty" style={{ padding: 80 }}><I.AlertCircle /><div>No se pudieron cargar los servicios</div>
          <button className="btn" style={{ marginTop: 10 }} onClick={() => refetch()}><I.Refresh /> Reintentar</button></div></div>
      ) : servicios.length === 0 ? (
        <div className="card"><div className="empty" style={{ padding: 80 }}><I.Boxes /><div>No se encontraron servicios</div></div></div>
      ) : vista === 'cards' ? (
        <>
          <div className="pcards">
            {servicios.map((s) => (
              <ServicioCard key={s.id} servicio={s} onZoom={setZoom}
                onVer={() => navigate(`/servicios/${s.id}`)} onEditar={() => { setEditar(s); setFormOpen(true) }}
                onToggle={() => cambiarEstado.mutate({ id: s.id, estado: s.estado === 'activo' ? 'inactivo' : 'activo' })}
                onEliminar={() => setAEliminar(s)} />
            ))}
          </div>
          {meta && meta.last_page > 1 && <div className="card"><Pagination meta={meta} page={page} setPage={setPage} /></div>}
        </>
      ) : (
        <div className="card">
          <table className="tbl">
            <thead><tr><th className="num" style={{ width: 48 }}>No.</th><th>Servicio</th><th className="num">Inversión</th><th className="num">Precio</th><th>Estado</th><th style={{ width: 140, textAlign: 'right' }}>Acciones</th></tr></thead>
            <tbody>
              {servicios.map((s, i) => {
                const activo = s.estado === 'activo'
                const thumb = thumbDe(s)
                const grande = grandeDe(s)
                return (
                  <tr key={s.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/servicios/${s.id}`)}>
                    <td className="num muted tnum">{(meta?.from ?? 1) + i}</td>
                    <td>
                      <div className="user-cell">
                        <div className={'ua' + (grande ? ' img-zoom' : '')} style={{ overflow: 'hidden' }} onClick={grande ? (e) => { e.stopPropagation(); setZoom(grande) } : undefined}>{thumb ? <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <I.Boxes size={15} />}</div>
                        <div>
                          <div className="un">{s.nombre}</div>
                          <div className="uh">{s.codigo}</div>
                        </div>
                      </div>
                    </td>
                    <td className="num tnum muted">{q(s.inversion_estimada)}</td>
                    <td className="num">
                      {s.precio_oferta ? (
                        <>
                          <div className="tnum" style={{ fontWeight: 600, color: 'var(--pos)' }}>{q(s.precio_oferta)}</div>
                          <div className="tnum muted" style={{ fontSize: 11, textDecoration: 'line-through' }}>{q(s.precio_venta)}</div>
                        </>
                      ) : <span className="tnum" style={{ fontWeight: 600 }}>{q(s.precio_venta)}</span>}
                    </td>
                    <td><span className="badge" data-tone={activo ? 'pos' : undefined}><span className="b-dot" />{activo ? 'Activo' : 'Inactivo'}</span></td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <ServicioAcciones activo={activo} onVer={() => navigate(`/servicios/${s.id}`)} onEditar={() => { setEditar(s); setFormOpen(true) }}
                        onToggle={() => cambiarEstado.mutate({ id: s.id, estado: activo ? 'inactivo' : 'activo' })} onEliminar={() => setAEliminar(s)} />
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
        title="Eliminar servicio" description={aEliminar ? `¿Eliminar "${aEliminar.nombre}"?` : ''}
        confirmLabel="Eliminar" danger loading={eliminar.isPending}
        onConfirm={() => aEliminar && eliminar.mutate(aEliminar.id)} />

      <ServicioForm open={formOpen} onClose={() => setFormOpen(false)} servicio={editar} />
      <Lightbox src={zoom} onClose={() => setZoom(null)} />
    </>
  )
}

// ── Acciones compartidas (tabla y card) ───────────────────────────────────────

function ServicioAcciones({ activo, onVer, onEditar, onToggle, onEliminar }: {
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

// ── Tarjeta de servicio ───────────────────────────────────────────────────────

function ServicioCard({ servicio: s, onZoom, onVer, onEditar, onToggle, onEliminar }: {
  servicio: Servicio; onZoom: (url: string) => void; onVer: () => void; onEditar: () => void; onToggle: () => void; onEliminar: () => void
}) {
  const activo = s.estado === 'activo'
  const thumb = thumbDe(s)
  const grande = grandeDe(s)
  const dcto = s.precio_oferta && s.precio_venta > 0
    ? Math.round(((s.precio_venta - s.precio_oferta) / s.precio_venta) * 100) : 0

  return (
    <div className="pcard" style={{ cursor: 'pointer' }} onClick={onVer}>
      <div className={'pcard-img' + (grande ? ' img-zoom' : '')} onClick={grande ? (e) => { e.stopPropagation(); onZoom(grande) } : undefined}>
        {thumb ? <img src={thumb} alt="" /> : <I.Boxes size={28} />}
        {dcto > 0 && <span className="pcard-oferta">-{dcto}%</span>}
        <span className="pcard-badge badge" data-tone={activo ? 'pos' : undefined}><span className="b-dot" />{activo ? 'Activo' : 'Inactivo'}</span>
      </div>
      <div className="pcard-body">
        <div className="pcard-sku">{s.codigo}</div>
        <div className="pcard-name">{s.nombre}</div>
        {s.descripcion && <div className="pcard-meta">{s.descripcion}</div>}
        <div className="pcard-bottom">
          <div className="pcard-price tnum">
            {s.precio_oferta ? (
              <>
                <span style={{ color: 'var(--pos)' }}>{q(s.precio_oferta)}</span>
                <span className="old">{q(s.precio_venta)}</span>
              </>
            ) : q(s.precio_venta)}
          </div>
          <span className="muted tnum" style={{ fontSize: 11.5 }}>Inv. {q(s.inversion_estimada)}</span>
        </div>
      </div>
      <div className="pcard-foot" onClick={(e) => e.stopPropagation()}>
        <span className="loc">&nbsp;</span>
        <ServicioAcciones activo={activo} onVer={onVer} onEditar={onEditar} onToggle={onToggle} onEliminar={onEliminar} />
      </div>
    </div>
  )
}
