import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Loader2, ChevronsLeft, Pencil, Ban, CheckCircle2, Mail, Phone, MapPin, FileText, Building2,
  ShoppingCart, Wallet, CalendarDays, Clock, RefreshCw, AlertCircle, Trash2,
} from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ClienteForm } from './ClienteForm'
import { inicialesNombre } from '@/lib/text'
import { clientesApi } from '@/lib/api'
import { q, fmtN, fmtFecha } from '@/lib/format'
import type { ClienteEstadisticas, ClienteVenta } from '@/types/cliente'

const ESTADO_VENTA: Record<string, { tone: 'pos' | 'warn' | 'neg'; label: string }> = {
  completada: { tone: 'pos', label: 'Completada' },
  pendiente: { tone: 'warn', label: 'Pendiente' },
  cancelada: { tone: 'neg', label: 'Cancelada' },
}

export default function ClienteDetalle() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [editar, setEditar] = useState(false)
  const [confirmarEliminar, setConfirmarEliminar] = useState(false)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['cliente', id],
    queryFn: () => clientesApi.obtener(Number(id)),
    enabled: !!id,
  })

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ['cliente', id] })
    queryClient.invalidateQueries({ queryKey: ['clientes'] })
  }

  const cambiarEstado = useMutation({
    mutationFn: () => clientesApi.cambiarEstado(Number(id)),
    onSuccess: () => { toast.success('Estado actualizado'); invalidar() },
    onError: () => toast.error('No se pudo cambiar el estado'),
  })
  const eliminar = useMutation({
    mutationFn: () => clientesApi.eliminar(Number(id)),
    onSuccess: () => { toast.success('Cliente eliminado'); queryClient.invalidateQueries({ queryKey: ['clientes'] }); navigate('/clientes') },
    onError: () => toast.error('No se pudo eliminar el cliente'),
  })

  if (isLoading) {
    return <div className="empty" style={{ padding: 120 }}><Loader2 size={26} className="spin" style={{ color: 'var(--accent)' }} /><div>Cargando cliente…</div></div>
  }
  if (isError || !data) {
    return (
      <div className="empty" style={{ padding: 120 }}>
        <AlertCircle /><div style={{ marginTop: 8 }}>No se pudo cargar el cliente</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button className="btn" onClick={() => navigate('/clientes')}><ChevronsLeft size={15} /> Clientes</button>
          <button className="btn btn-primary" onClick={() => refetch()}><RefreshCw size={15} /> Reintentar</button>
        </div>
      </div>
    )
  }

  const c = data.cliente
  const activo = c.estado === 'activo'

  return (
    <>
      <div className="page-head" style={{ alignItems: 'center' }}>
        <button className="back-link" onClick={() => navigate('/clientes')}><ChevronsLeft /> Clientes</button>
        <div className="hero-actions">
          <button className="btn" disabled={cambiarEstado.isPending} onClick={() => cambiarEstado.mutate()}>
            {activo ? <><Ban size={15} /> Desactivar</> : <><CheckCircle2 size={15} /> Activar</>}
          </button>
          <button className="btn btn-primary" onClick={() => setEditar(true)}><Pencil size={15} /> Editar cliente</button>
        </div>
      </div>

      <div className="card profile-header">
        <div className="profile-avatar">{inicialesNombre(c.nombre)}</div>
        <div className="profile-id">
          <div className="profile-name-row">
            <span className="profile-name">{c.nombre}</span>
            <span className="badge" data-tone={activo ? 'pos' : undefined}><span className="b-dot" />{activo ? 'Activo' : 'Inactivo'}</span>
            <span className="role-badge" data-role={c.tipo === 'juridico' ? 'admin' : 'vendedor'}>
              <Building2 />{c.tipo === 'natural' ? 'Natural' : 'Jurídico'}
            </span>
          </div>
          <div className="profile-contact">
            <span className="pc"><FileText />{c.nit ? `NIT: ${c.nit}` : 'C/F'}</span>
            {c.email && <span className="pc"><Mail />{c.email}</span>}
            {c.telefono && <span className="pc"><Phone />{c.telefono}</span>}
          </div>
        </div>
      </div>

      <KpiStrip est={data.estadisticas} />

      <div className="detail-grid">
        <div className="detail-col">
          <DetailTabs c={c} ventas={c.ventas ?? []} />
        </div>

        <div className="detail-col">
          <div className="card">
            <div className="card-header"><div className="card-title"><Clock size={15} style={{ color: 'var(--text-muted)' }} />Actividad</div></div>
            <div className="timeline">
              <TlItem icon={<ShoppingCart />} label="Última compra"
                value={data.estadisticas.ultima_compra ? fmtFecha(data.estadisticas.ultima_compra.created_at, true) : 'Sin compras'} />
              <TlItem icon={<CalendarDays />} label="Cliente desde" value={c.created_at ? fmtFecha(c.created_at) : '—'} />
            </div>
          </div>

          <div className="card">
            <div className="card-header"><div className="card-title"><AlertCircle size={15} style={{ color: 'var(--neg)' }} />Zona de riesgo</div></div>
            <div className="action-list">
              <button className="action-btn" data-variant="danger" onClick={() => setConfirmarEliminar(true)}><Trash2 /> Eliminar cliente</button>
              <div style={{ fontSize: 11.5, color: 'var(--text-faint)', padding: '0 2px', lineHeight: 1.5 }}>
                Si el cliente tiene ventas asociadas se marcará como inactivo en lugar de borrarse.
              </div>
            </div>
          </div>
        </div>
      </div>

      <ClienteForm open={editar} onClose={() => setEditar(false)} cliente={c} />
      <ConfirmDialog open={confirmarEliminar} onOpenChange={setConfirmarEliminar}
        title="Eliminar cliente" description={`¿Eliminar a "${c.nombre}"?`}
        confirmLabel="Eliminar" danger loading={eliminar.isPending} onConfirm={() => eliminar.mutate()} />
    </>
  )
}

function KpiStrip({ est }: { est: ClienteEstadisticas }) {
  const items = [
    { label: 'Total compras', value: fmtN(est.total_ventas), icon: ShoppingCart, tone: 'accent' as const, sub: 'compras completadas' },
    { label: 'Total gastado', value: fmtN(est.total_gastado), currency: 'Q', icon: Wallet, tone: 'pos' as const, sub: 'histórico' },
    { label: 'Compras este mes', value: fmtN(est.ventas_mes_actual), icon: CalendarDays, tone: 'info' as const, sub: 'mes actual' },
    { label: 'Gastado este mes', value: fmtN(est.total_mes_actual), currency: 'Q', icon: Wallet, tone: 'violet' as const, sub: 'mes actual' },
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

function DetailTabs({ c, ventas }: { c: { email: string | null; telefono: string | null; direccion: string | null; notas: string | null }; ventas: ClienteVenta[] }) {
  const navigate = useNavigate()
  const [tab, setTab] = useState<'resumen' | 'compras'>('resumen')
  const TABS = [
    { id: 'resumen' as const, label: 'Resumen' },
    { id: 'compras' as const, label: `Compras${ventas.length ? ` · ${ventas.length}` : ''}` },
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
          <InfoItem icon={<Mail />} label="Correo" value={c.email} empty="No registrado" />
          <InfoItem icon={<Phone />} label="Teléfono" value={c.telefono} empty="No registrado" />
          <InfoItem icon={<MapPin />} label="Dirección" value={c.direccion} empty="Sin dirección" full />
          <InfoItem icon={<FileText />} label="Notas" value={c.notas} empty="Sin notas" full />
        </div>
      )}

      {tab === 'compras' && (
        ventas.length > 0 ? (
          <table className="tbl">
            <thead><tr><th>N° Venta</th><th>Fecha</th><th className="num">Total</th><th>Estado</th></tr></thead>
            <tbody>
              {ventas.map((v) => {
                const e = ESTADO_VENTA[v.estado] ?? { tone: 'warn' as const, label: v.estado }
                return (
                  <tr key={v.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/ventas?ver=${v.id}`)} title="Ver venta">
                    <td style={{ fontWeight: 600, color: 'var(--info)' }}>{v.numero_venta}</td>
                    <td className="muted">{fmtFecha(v.created_at, true)}</td>
                    <td className="num tnum" style={{ fontWeight: 600 }}>{q(v.total)}</td>
                    <td><span className="badge" data-tone={e.tone}><span className="b-dot" />{e.label}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <div className="empty" style={{ padding: 50 }}><ShoppingCart /><div>Este cliente aún no tiene compras registradas.</div></div>
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
