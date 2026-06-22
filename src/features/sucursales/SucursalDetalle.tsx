import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Loader2, ChevronsLeft, Pencil, Ban, CheckCircle2, Phone, MapPin, Clock,
  ShoppingCart, Users, CalendarDays, RefreshCw, AlertCircle, Trash2,
} from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { SucursalForm } from './SucursalForm'
import { inicialesNombre } from '@/lib/text'
import { sucursalesApi } from '@/lib/api'
import { fmtN, fmtFecha } from '@/lib/format'
import type { SucursalUsuario } from '@/types/sucursal'

const ROL_LABEL: Record<string, string> = { administrador: 'Administrador', vendedor: 'Vendedor', analista: 'Analista' }

export default function SucursalDetalle() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [editar, setEditar] = useState(false)
  const [confirmarEliminar, setConfirmarEliminar] = useState(false)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['sucursal', id],
    queryFn: () => sucursalesApi.obtener(Number(id)),
    enabled: !!id,
  })

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ['sucursal', id] })
    queryClient.invalidateQueries({ queryKey: ['sucursales'] })
  }

  const cambiarEstado = useMutation({
    mutationFn: (estado: 'activo' | 'inactivo') => sucursalesApi.cambiarEstado(Number(id), estado),
    onSuccess: () => { toast.success('Estado actualizado'); invalidar() },
    onError: () => toast.error('No se pudo cambiar el estado'),
  })
  const eliminar = useMutation({
    mutationFn: () => sucursalesApi.eliminar(Number(id)),
    onSuccess: () => { toast.success('Sucursal eliminada'); queryClient.invalidateQueries({ queryKey: ['sucursales'] }); navigate('/sucursales') },
    onError: () => toast.error('No se pudo eliminar la sucursal'),
  })

  if (isLoading) {
    return <div className="empty" style={{ padding: 120 }}><Loader2 size={26} className="spin" style={{ color: 'var(--accent)' }} /><div>Cargando sucursal…</div></div>
  }
  if (isError || !data) {
    return (
      <div className="empty" style={{ padding: 120 }}>
        <AlertCircle /><div style={{ marginTop: 8 }}>No se pudo cargar la sucursal</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button className="btn" onClick={() => navigate('/sucursales')}><ChevronsLeft size={15} /> Sucursales</button>
          <button className="btn btn-primary" onClick={() => refetch()}><RefreshCw size={15} /> Reintentar</button>
        </div>
      </div>
    )
  }

  const s = data.sucursal
  const activa = s.estado === 'activo'
  const personalActivo = s.usuarios.filter((u) => u.estado === 'activo').length

  return (
    <>
      <div className="page-head" style={{ alignItems: 'center' }}>
        <button className="back-link" onClick={() => navigate('/sucursales')}><ChevronsLeft /> Sucursales</button>
        <div className="hero-actions">
          <button className="btn" disabled={cambiarEstado.isPending} onClick={() => cambiarEstado.mutate(activa ? 'inactivo' : 'activo')}>
            {activa ? <><Ban size={15} /> Desactivar</> : <><CheckCircle2 size={15} /> Activar</>}
          </button>
          <button className="btn btn-primary" onClick={() => setEditar(true)}><Pencil size={15} /> Editar sucursal</button>
        </div>
      </div>

      <div className="card profile-header">
        <div className="profile-avatar">{inicialesNombre(s.nombre)}</div>
        <div className="profile-id">
          <div className="profile-name-row">
            <span className="profile-name">{s.nombre}</span>
            <span className="badge" data-tone={activa ? 'pos' : undefined}><span className="b-dot" />{activa ? 'Activa' : 'Inactiva'}</span>
          </div>
          <div className="profile-contact">
            {s.telefono && <span className="pc"><Phone />{s.telefono}</span>}
            <span className="pc"><MapPin />{[s.municipio, s.departamento].filter(Boolean).join(', ') || 'Sin ubicación'}</span>
            {s.horario && <span className="pc"><Clock />{s.horario}</span>}
          </div>
        </div>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <Kpi label="Ventas registradas" value={fmtN(s.ventas_count)} icon={ShoppingCart} tone="accent" sub="histórico" />
        <Kpi label="Personal asignado" value={fmtN(s.usuarios.length)} icon={Users} tone="info" sub="usuarios" />
        <Kpi label="Personal activo" value={fmtN(personalActivo)} icon={CheckCircle2} tone="pos" sub="con acceso" />
      </div>

      <div className="detail-grid">
        <div className="detail-col">
          <DetailTabs s={s} personal={s.usuarios} />
        </div>

        <div className="detail-col">
          <div className="card">
            <div className="card-header"><div className="card-title"><Clock size={15} style={{ color: 'var(--text-muted)' }} />Cronología</div></div>
            <div className="timeline">
              <TlItem icon={<CalendarDays />} label="Registrada" value={s.created_at ? fmtFecha(s.created_at) : '—'} />
              <TlItem icon={<Clock />} label="Horario" value={s.horario || 'No definido'} active={activa} />
            </div>
          </div>

          <div className="card">
            <div className="card-header"><div className="card-title"><AlertCircle size={15} style={{ color: 'var(--neg)' }} />Zona de riesgo</div></div>
            <div className="action-list">
              <button className="action-btn" data-variant="danger" onClick={() => setConfirmarEliminar(true)}><Trash2 /> Eliminar sucursal</button>
              <div style={{ fontSize: 11.5, color: 'var(--text-faint)', padding: '0 2px', lineHeight: 1.5 }}>
                El historial de ventas y el personal asignado quedarán sin sucursal.
              </div>
            </div>
          </div>
        </div>
      </div>

      <SucursalForm open={editar} onClose={() => setEditar(false)} sucursal={s} />
      <ConfirmDialog open={confirmarEliminar} onOpenChange={setConfirmarEliminar}
        title="Eliminar sucursal" description={`¿Eliminar "${s.nombre}"?`}
        confirmLabel="Eliminar" danger loading={eliminar.isPending} onConfirm={() => eliminar.mutate()} />
    </>
  )
}

function Kpi({ label, value, icon: IconC, tone, sub }: { label: string; value: string; icon: typeof Users; tone: string; sub: string }) {
  return (
    <div className="kpi">
      <div className="kpi-row1"><div className="kpi-label">{label}</div><div className="kpi-icon" data-tone={tone}><IconC /></div></div>
      <div className="kpi-value tnum">{value}</div>
      <div className="kpi-meta"><span>{sub}</span></div>
    </div>
  )
}

function DetailTabs({ s, personal }: { s: { direccion: string | null; referencia: string | null; municipio: string | null; departamento: string | null; telefono: string | null; horario: string | null }; personal: SucursalUsuario[] }) {
  const [tab, setTab] = useState<'resumen' | 'personal'>('resumen')
  const TABS = [
    { id: 'resumen' as const, label: 'Resumen' },
    { id: 'personal' as const, label: `Personal${personal.length ? ` · ${personal.length}` : ''}` },
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
          <InfoItem icon={<Phone />} label="Teléfono" value={s.telefono} empty="No registrado" />
          <InfoItem icon={<Clock />} label="Horario" value={s.horario} empty="No definido" />
          <InfoItem icon={<MapPin />} label="Municipio" value={s.municipio} empty="—" />
          <InfoItem icon={<MapPin />} label="Departamento" value={s.departamento} empty="—" />
          <InfoItem icon={<MapPin />} label="Dirección" value={s.direccion} empty="Sin dirección" full />
          <InfoItem icon={<MapPin />} label="Referencia" value={s.referencia} empty="Sin referencia" full />
        </div>
      )}

      {tab === 'personal' && (
        personal.length > 0 ? (
          <table className="tbl">
            <tbody>
              {personal.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="user-cell">
                      <div className="ua">{inicialesNombre(`${u.nombres} ${u.apellidos}`)}</div>
                      <div>
                        <div className="un">{u.nombres} {u.apellidos}</div>
                        <div className="uh">{ROL_LABEL[u.rol] ?? u.rol}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span className="badge" data-tone={u.estado === 'activo' ? 'pos' : undefined}><span className="b-dot" />{u.estado === 'activo' ? 'Activo' : 'Inactivo'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty" style={{ padding: 50 }}><Users /><div>No hay personal asignado a esta sucursal.</div></div>
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

function TlItem({ icon, label, value, active }: { icon: React.ReactNode; label: string; value: string; active?: boolean }) {
  return (
    <div className="tl-item">
      <span className="tl-dot" data-active={active} />
      <div>
        <div className="tl-label">{icon} {label}</div>
        <div className="tl-value">{value}</div>
      </div>
    </div>
  )
}
