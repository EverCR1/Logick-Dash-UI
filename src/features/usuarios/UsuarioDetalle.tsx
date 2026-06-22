import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Loader2, ChevronsLeft, Pencil, Ban, CheckCircle2, AtSign, Mail, Phone, Store, MapPin,
  ShoppingCart, Wallet, Clock, CalendarDays, RefreshCw, Zap, Activity, AlertCircle, Trash2,
} from 'lucide-react'
import { Donut, type DonutSegment } from '@/components/charts'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { UsuarioForm } from './UsuarioForm'
import { rolMeta, iniciales, PERMISOS, type RolKey } from './usuario-meta'
import { usuariosApi } from '@/lib/api'
import { q, fmtN, fmtFecha } from '@/lib/format'
import type { UsuarioConSucursal, UsuarioVentasResumen, VentaReciente } from '@/types/usuario'

const ESTADO_VENTA: Record<string, { tone: 'pos' | 'warn' | 'neg'; label: string }> = {
  completada: { tone: 'pos', label: 'Completada' },
  pendiente: { tone: 'warn', label: 'Pendiente' },
  cancelada: { tone: 'neg', label: 'Cancelada' },
}

export default function UsuarioDetalle() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [editar, setEditar] = useState(false)
  const [confirmarEliminar, setConfirmarEliminar] = useState(false)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['usuario', id],
    queryFn: () => usuariosApi.obtener(Number(id)),
    enabled: !!id,
  })

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ['usuario', id] })
    queryClient.invalidateQueries({ queryKey: ['usuarios'] })
  }

  const cambiarEstado = useMutation({
    mutationFn: (estado: 'activo' | 'inactivo') => usuariosApi.cambiarEstado(Number(id), estado),
    onSuccess: () => { toast.success('Estado actualizado'); invalidar() },
    onError: () => toast.error('No se pudo cambiar el estado'),
  })
  const eliminar = useMutation({
    mutationFn: () => usuariosApi.eliminar(Number(id)),
    onSuccess: () => { toast.success('Usuario eliminado'); queryClient.invalidateQueries({ queryKey: ['usuarios'] }); navigate('/usuarios') },
    onError: () => toast.error('No se pudo eliminar el usuario'),
  })

  if (isLoading) {
    return <div className="empty" style={{ padding: 120 }}><Loader2 size={26} className="spin" style={{ color: 'var(--accent)' }} /><div>Cargando usuario…</div></div>
  }
  if (isError || !data) {
    return (
      <div className="empty" style={{ padding: 120 }}>
        <AlertCircle /><div style={{ marginTop: 8 }}>No se pudo cargar el usuario</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button className="btn" onClick={() => navigate('/usuarios')}><ChevronsLeft size={15} /> Usuarios</button>
          <button className="btn btn-primary" onClick={() => refetch()}><RefreshCw size={15} /> Reintentar</button>
        </div>
      </div>
    )
  }

  const u = data.user
  const role = rolMeta(u.rol)
  const RoleIcon = role.icon
  const activo = u.estado === 'activo'

  return (
    <>
      <div className="page-head" style={{ alignItems: 'center' }}>
        <button className="back-link" onClick={() => navigate('/usuarios')}><ChevronsLeft /> Usuarios</button>
        <div className="hero-actions">
          <button className="btn" disabled={cambiarEstado.isPending} onClick={() => cambiarEstado.mutate(activo ? 'inactivo' : 'activo')}>
            {activo ? <><Ban size={15} /> Desactivar</> : <><CheckCircle2 size={15} /> Activar</>}
          </button>
          <button className="btn btn-primary" onClick={() => setEditar(true)}><Pencil size={15} /> Editar usuario</button>
        </div>
      </div>

      {/* Cabecera de perfil */}
      <div className="card profile-header">
        <div className="profile-avatar">{iniciales(u.nombres, u.apellidos)}</div>
        <div className="profile-id">
          <div className="profile-name-row">
            <span className="profile-name">{u.nombres} {u.apellidos}</span>
            <span className="badge" data-tone={activo ? 'pos' : undefined}><span className="b-dot" />{activo ? 'Activo' : 'Inactivo'}</span>
            <span className="role-badge" data-role={role.dataRole}><RoleIcon />{role.label}</span>
          </div>
          <div className="profile-contact">
            <span className="pc"><AtSign />@{u.username}</span>
            <span className="pc"><Mail />{u.email}</span>
            {u.telefono && <span className="pc"><Phone />{u.telefono}</span>}
            <span className="pc"><Store />{u.sucursal?.nombre ?? 'Sin sucursal'}</span>
          </div>
        </div>
      </div>

      <KpiStrip ventas={data.ventas} />

      <div className="detail-grid">
        <div className="detail-col">
          <DetailTabs u={u} ventas={data.ventas} role={role} />
        </div>

        <div className="detail-col">
          <div className="card">
            <div className="card-header"><div className="card-title"><Activity size={15} style={{ color: 'var(--accent-text)' }} />Rendimiento</div></div>
            <CloseGauge total={data.ventas.total} completadas={data.ventas.completadas} />
          </div>

          <div className="card">
            <div className="card-header"><div className="card-title"><Clock size={15} style={{ color: 'var(--text-muted)' }} />Cronología</div></div>
            <div className="timeline">
              <TlItem icon={<CalendarDays />} label="Registro" value={fmtFecha(u.created_at)} />
              <TlItem icon={<RefreshCw />} label="Última actualización" value={fmtFecha(u.updated_at)} />
              <TlItem icon={<Zap />} label="Último acceso" value={u.last_login_at ? fmtFecha(u.last_login_at, true) : 'Nunca'} active={activo} />
            </div>
          </div>

          <div className="card">
            <div className="card-header"><div className="card-title"><AlertCircle size={15} style={{ color: 'var(--neg)' }} />Zona de riesgo</div></div>
            <div className="action-list">
              <button className="action-btn" data-variant="danger" onClick={() => setConfirmarEliminar(true)}><Trash2 /> Eliminar usuario</button>
              <div style={{ fontSize: 11.5, color: 'var(--text-faint)', padding: '0 2px', lineHeight: 1.5 }}>
                Esta acción es permanente y no se puede deshacer. Se eliminarán todos los datos asociados a la cuenta.
              </div>
            </div>
          </div>
        </div>
      </div>

      <UsuarioForm open={editar} onClose={() => setEditar(false)} usuario={u} />
      <ConfirmDialog open={confirmarEliminar} onOpenChange={setConfirmarEliminar}
        title="Eliminar usuario" description={`¿Eliminar a "${u.nombres} ${u.apellidos}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar" danger loading={eliminar.isPending} onConfirm={() => eliminar.mutate()} />
    </>
  )
}

function KpiStrip({ ventas }: { ventas: UsuarioVentasResumen }) {
  const items = [
    { label: 'Total ventas', value: fmtN(ventas.total), icon: ShoppingCart, tone: 'accent' as const, sub: 'transacciones' },
    { label: 'Monto total', value: fmtN(ventas.monto_total), currency: 'Q', icon: Wallet, tone: 'info' as const, sub: 'ventas completadas' },
    { label: 'Completadas', value: fmtN(ventas.completadas), icon: CheckCircle2, tone: 'pos' as const, sub: 'cerradas' },
    { label: 'Pendientes', value: fmtN(ventas.pendientes), icon: Clock, tone: 'warn' as const, sub: 'por completar' },
  ]
  return (
    <div className="kpi-grid">
      {items.map((it, i) => {
        const IconC = it.icon
        return (
          <div key={i} className="kpi">
            <div className="kpi-row1"><div className="kpi-label">{it.label}</div><div className="kpi-icon" data-tone={it.tone}><IconC /></div></div>
            <div className="kpi-value tnum">{it.currency && <span className="currency">{it.currency}</span>}{it.value}</div>
            <div className="kpi-meta"><span>{it.sub}</span></div>
          </div>
        )
      })}
    </div>
  )
}

function CloseGauge({ total, completadas }: { total: number; completadas: number }) {
  const tasa = total ? Math.round((completadas / total) * 100) : 0
  const segments: DonutSegment[] = tasa > 0
    ? [{ label: 'Completadas', value: tasa, color: 'var(--pos)' }, { label: 'Otras', value: 100 - tasa, color: 'var(--bg-elev-3)' }]
    : [{ label: 'Sin datos', value: 100, color: 'var(--bg-elev-3)' }]
  return (
    <div className="gauge-row">
      <div className="gauge-wrap">
        <Donut segments={segments} size={120} thickness={14} />
        <div className="gauge-center"><div className="gv tnum">{tasa}%</div><div className="gl">cierre</div></div>
      </div>
      <div className="gauge-legend">
        <div className="gauge-legend-row"><span className="gsw" style={{ background: 'var(--pos)' }} /><span className="gn">Completadas</span></div>
        <div className="gauge-legend-row"><span className="gsw" style={{ background: 'var(--warn)' }} /><span className="gn">Pendientes</span></div>
        <div className="gauge-legend-row" style={{ marginTop: 2, paddingTop: 9, borderTop: '1px solid var(--border)' }}>
          <span className="gn">Tasa de cierre</span>
          <span className="gc" style={{ color: tasa >= 90 ? 'var(--pos)' : tasa >= 70 ? 'var(--text)' : 'var(--warn)' }}>
            {tasa >= 90 ? 'Excelente' : tasa >= 70 ? 'Buena' : tasa > 0 ? 'A mejorar' : '—'}
          </span>
        </div>
      </div>
    </div>
  )
}

function DetailTabs({ u, ventas, role }: { u: UsuarioConSucursal; ventas: UsuarioVentasResumen; role: ReturnType<typeof rolMeta> }) {
  const [tab, setTab] = useState<'resumen' | 'ventas' | 'permisos'>('resumen')
  const permisos = PERMISOS[u.rol as RolKey] ?? []
  const TABS = [
    { id: 'resumen' as const, label: 'Resumen' },
    { id: 'ventas' as const, label: `Ventas${ventas.total ? ` · ${ventas.total}` : ''}` },
    { id: 'permisos' as const, label: 'Permisos' },
  ]
  return (
    <div className="card detail-tabs-card">
      <div className="card-header">
        <div className="tabs">
          {TABS.map((t) => <button key={t.id} className="tab" data-active={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</button>)}
        </div>
        {tab === 'permisos' && <span className="role-badge" data-role={role.dataRole}>{role.label}</span>}
      </div>

      {tab === 'resumen' && (
        <div className="info-grid">
          <InfoItem icon={<AtSign />} label="Usuario" value={`@${u.username}`} />
          <InfoItem icon={<Mail />} label="Correo" value={u.email} />
          <InfoItem icon={<Phone />} label="Teléfono" value={u.telefono} empty="No registrado" />
          <InfoItem icon={<Store />} label="Sucursal" value={u.sucursal?.nombre} empty="Sin sucursal" />
          <InfoItem icon={<MapPin />} label="Dirección" value={u.direccion} empty="Sin dirección registrada" full />
        </div>
      )}

      {tab === 'ventas' && (
        ventas.recientes.length > 0 ? (
          <table className="tbl">
            <thead><tr><th>N° Venta</th><th>Fecha</th><th className="num">Total</th><th>Estado</th></tr></thead>
            <tbody>
              {ventas.recientes.map((v: VentaReciente) => {
                const e = ESTADO_VENTA[v.estado] ?? { tone: 'warn' as const, label: v.estado }
                return (
                  <tr key={v.id}>
                    <td style={{ fontWeight: 600 }}>{v.numero_venta}</td>
                    <td className="muted">{fmtFecha(v.created_at, true)}</td>
                    <td className="num tnum" style={{ fontWeight: 600 }}>{q(v.total)}</td>
                    <td><span className="badge" data-tone={e.tone}><span className="b-dot" />{e.label}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <div className="empty" style={{ padding: 50 }}><ShoppingCart /><div>Este usuario aún no tiene ventas registradas.</div></div>
        )
      )}

      {tab === 'permisos' && (
        <div className="chips">
          {permisos.map((p, i) => { const PIcon = p.icon; return <span key={i} className="chip"><PIcon />{p.label}</span> })}
        </div>
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
