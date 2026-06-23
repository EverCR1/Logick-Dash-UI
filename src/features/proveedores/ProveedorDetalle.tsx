import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Loader2, ChevronsLeft, Pencil, Ban, CheckCircle2, Mail, Phone, MapPin, FileText, Truck,
  Boxes, Package, CalendarDays, Clock, RefreshCw, AlertCircle, Trash2,
} from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ProveedorForm } from './ProveedorForm'
import { proveedoresApi } from '@/lib/api'
import { q, fmtN, fmtFecha } from '@/lib/format'
import type { ProveedorProducto } from '@/types/proveedor'

export default function ProveedorDetalle() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [editar, setEditar] = useState(false)
  const [confirmarEliminar, setConfirmarEliminar] = useState(false)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['proveedor', id],
    queryFn: () => proveedoresApi.obtener(Number(id)),
    enabled: !!id,
  })

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ['proveedor', id] })
    queryClient.invalidateQueries({ queryKey: ['proveedores'] })
  }

  const cambiarEstado = useMutation({
    mutationFn: (estado: 'activo' | 'inactivo') => proveedoresApi.cambiarEstado(Number(id), estado),
    onSuccess: () => { toast.success('Estado actualizado'); invalidar() },
    onError: () => toast.error('No se pudo cambiar el estado'),
  })
  const eliminar = useMutation({
    mutationFn: () => proveedoresApi.eliminar(Number(id)),
    onSuccess: () => { toast.success('Proveedor eliminado'); queryClient.invalidateQueries({ queryKey: ['proveedores'] }); navigate('/proveedores') },
    onError: () => toast.error('No se pudo eliminar el proveedor'),
  })

  if (isLoading) {
    return <div className="empty" style={{ padding: 120 }}><Loader2 size={26} className="spin" style={{ color: 'var(--accent)' }} /><div>Cargando proveedor…</div></div>
  }
  if (isError || !data) {
    return (
      <div className="empty" style={{ padding: 120 }}>
        <AlertCircle /><div style={{ marginTop: 8 }}>No se pudo cargar el proveedor</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button className="btn" onClick={() => navigate('/proveedores')}><ChevronsLeft size={15} /> Proveedores</button>
          <button className="btn btn-primary" onClick={() => refetch()}><RefreshCw size={15} /> Reintentar</button>
        </div>
      </div>
    )
  }

  const p = data.proveedor
  const activo = p.estado === 'activo'
  const inactivos = Math.max(0, p.productos_count - p.productos_activos_count)

  return (
    <>
      <div className="page-head" style={{ alignItems: 'center' }}>
        <button className="back-link" onClick={() => navigate('/proveedores')}><ChevronsLeft /> Proveedores</button>
        <div className="hero-actions">
          <button className="btn" disabled={cambiarEstado.isPending} onClick={() => cambiarEstado.mutate(activo ? 'inactivo' : 'activo')}>
            {activo ? <><Ban size={15} /> Desactivar</> : <><CheckCircle2 size={15} /> Activar</>}
          </button>
          <button className="btn btn-primary" onClick={() => setEditar(true)}><Pencil size={15} /> Editar proveedor</button>
        </div>
      </div>

      <div className="card profile-header">
        <div className="profile-avatar"><Truck size={26} /></div>
        <div className="profile-id">
          <div className="profile-name-row">
            <span className="profile-name">{p.nombre}</span>
            <span className="badge" data-tone={activo ? 'pos' : undefined}><span className="b-dot" />{activo ? 'Activo' : 'Inactivo'}</span>
          </div>
          <div className="profile-contact">
            {p.email && <span className="pc"><Mail />{p.email}</span>}
            {p.telefono && <span className="pc"><Phone />{p.telefono}</span>}
            {p.direccion && <span className="pc"><MapPin />{p.direccion}</span>}
          </div>
        </div>
      </div>

      <div className="kpi-grid">
        <Kpi label="Total productos" value={fmtN(p.productos_count)} icon={Package} tone="accent" sub="suministrados" />
        <Kpi label="Activos" value={fmtN(p.productos_activos_count)} icon={CheckCircle2} tone="pos" sub="en catálogo" />
        <Kpi label="Inactivos" value={fmtN(inactivos)} icon={Ban} tone="warn" sub="fuera de catálogo" />
        <Kpi label="Antigüedad" value={fmtN(p.dias_como_proveedor)} icon={CalendarDays} tone="info" sub="días como proveedor" />
      </div>

      <div className="detail-grid">
        <div className="detail-col">
          <DetailTabs p={p} productos={p.productos} />
        </div>

        <div className="detail-col">
          <div className="card">
            <div className="card-header"><div className="card-title"><Clock size={15} style={{ color: 'var(--text-muted)' }} />Información</div></div>
            <div className="timeline">
              <TlItem icon={<CalendarDays />} label="Proveedor desde" value={p.created_at ? fmtFecha(p.created_at) : '—'} />
              <TlItem icon={<Boxes />} label="Catálogo" value={`${p.productos_activos_count} de ${p.productos_count} activos`} />
            </div>
          </div>

          <div className="card">
            <div className="card-header"><div className="card-title"><AlertCircle size={15} style={{ color: 'var(--neg)' }} />Zona de riesgo</div></div>
            <div className="action-list">
              <button className="action-btn" data-variant="danger" onClick={() => setConfirmarEliminar(true)}><Trash2 /> Eliminar proveedor</button>
              <div style={{ fontSize: 11.5, color: 'var(--text-faint)', padding: '0 2px', lineHeight: 1.5 }}>
                Si el proveedor tiene productos asociados, considera reasignarlos antes de eliminarlo.
              </div>
            </div>
          </div>
        </div>
      </div>

      <ProveedorForm open={editar} onClose={() => setEditar(false)} proveedor={p} />
      <ConfirmDialog open={confirmarEliminar} onOpenChange={setConfirmarEliminar}
        title="Eliminar proveedor" description={`¿Eliminar "${p.nombre}"?`}
        confirmLabel="Eliminar" danger loading={eliminar.isPending} onConfirm={() => eliminar.mutate()} />
    </>
  )
}

function Kpi({ label, value, icon: IconC, tone, sub }: { label: string; value: string; icon: typeof Package; tone: string; sub: string }) {
  return (
    <div className="kpi">
      <div className="kpi-row1"><div className="kpi-label">{label}</div><div className="kpi-icon" data-tone={tone}><IconC /></div></div>
      <div className="kpi-value tnum">{value}</div>
      <div className="kpi-meta"><span>{sub}</span></div>
    </div>
  )
}

function DetailTabs({ p, productos }: { p: { email: string | null; telefono: string | null; direccion: string | null; descripcion: string | null }; productos: ProveedorProducto[] }) {
  const navigate = useNavigate()
  const [tab, setTab] = useState<'resumen' | 'productos'>('resumen')
  const TABS = [
    { id: 'resumen' as const, label: 'Resumen' },
    { id: 'productos' as const, label: `Productos${productos.length ? ` · ${productos.length}` : ''}` },
  ]
  return (
    <div className="card detail-tabs-card">
      <div className="card-header">
        <div className="tabs">
          {TABS.map((t) => <button key={t.id} className="tab" data-active={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</button>)}
        </div>
      </div>

      {tab === 'resumen' && (
        <div className="info-grid">
          <InfoItem icon={<Mail />} label="Correo" value={p.email} empty="No registrado" />
          <InfoItem icon={<Phone />} label="Teléfono" value={p.telefono} empty="No registrado" />
          <InfoItem icon={<MapPin />} label="Dirección" value={p.direccion} empty="Sin dirección" full />
          <InfoItem icon={<FileText />} label="Descripción" value={p.descripcion} empty="Sin descripción" full />
        </div>
      )}

      {tab === 'productos' && (
        productos.length > 0 ? (
          <table className="tbl">
            <thead><tr><th>Producto</th><th>Marca</th><th className="num">Precio</th><th className="num">Stock</th><th>Estado</th></tr></thead>
            <tbody>
              {productos.map((pr) => {
                const tono = pr.stock <= 0 ? 'neg' : pr.stock <= pr.stock_minimo ? 'warn' : 'pos'
                return (
                  <tr key={pr.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/productos/${pr.id}`)} title="Ver producto">
                    <td>
                      <div style={{ fontWeight: 500, color: 'var(--info)' }}>{pr.nombre}</div>
                      <div className="muted" style={{ fontSize: 11.5 }}>{pr.sku}</div>
                    </td>
                    <td className="muted">{pr.marca ?? '—'}</td>
                    <td className="num tnum" style={{ fontWeight: 600 }}>{q(pr.precio_venta)}</td>
                    <td className="num"><span className="badge" data-tone={tono}><span className="b-dot" />{pr.stock}</span></td>
                    <td><span className="badge" data-tone={pr.estado === 'activo' ? 'pos' : undefined}><span className="b-dot" />{pr.estado === 'activo' ? 'Activo' : 'Inactivo'}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <div className="empty" style={{ padding: 50 }}><Package /><div>Este proveedor aún no tiene productos asociados.</div></div>
        )
      )}
    </div>
  )
}

function InfoItem({ icon, label, value, empty, full }: { icon: React.ReactNode; label: string; value?: string | null; empty?: string; full?: boolean }) {
  return (
    <div className={'info-item' + (full ? ' full' : '')}>
      <div className="il">{icon} {label}</div>
      <div className={'iv' + (value ? '' : ' empty')}>{value || empty || '—'}</div>
    </div>
  )
}

function TlItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="tl-item">
      <span className="tl-dot" />
      <div>
        <div className="tl-label">{icon} {label}</div>
        <div className="tl-value">{value}</div>
      </div>
    </div>
  )
}
