import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Loader2, ChevronsLeft, Pencil, Ban, CheckCircle2, Wallet, Tag, TrendingUp,
  CalendarDays, RefreshCw, AlertCircle, Trash2, Boxes, FileText, X,
} from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ServicioForm } from './ServicioForm'
import { serviciosApi } from '@/lib/api'
import { q, fmtFecha } from '@/lib/format'

export default function ServicioDetalle() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [editar, setEditar] = useState(false)
  const [confirmarEliminar, setConfirmarEliminar] = useState(false)
  const [lightbox, setLightbox] = useState<string | null>(null)

  const { data: s, isLoading, isError, refetch } = useQuery({
    queryKey: ['servicio', id],
    queryFn: () => serviciosApi.obtener(Number(id)),
    enabled: !!id,
  })

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ['servicio', id] })
    queryClient.invalidateQueries({ queryKey: ['servicios'] })
  }
  const cambiarEstado = useMutation({
    mutationFn: (estado: 'activo' | 'inactivo') => serviciosApi.cambiarEstado(Number(id), estado),
    onSuccess: () => { toast.success('Estado actualizado'); invalidar() },
    onError: () => toast.error('No se pudo cambiar el estado'),
  })
  const eliminar = useMutation({
    mutationFn: () => serviciosApi.eliminar(Number(id)),
    onSuccess: () => { toast.success('Servicio eliminado'); queryClient.invalidateQueries({ queryKey: ['servicios'] }); navigate('/servicios') },
    onError: () => toast.error('No se pudo eliminar el servicio'),
  })

  if (isLoading) {
    return <div className="empty" style={{ padding: 120 }}><Loader2 size={26} className="spin" style={{ color: 'var(--accent)' }} /><div>Cargando servicio…</div></div>
  }
  if (isError || !s) {
    return (
      <div className="empty" style={{ padding: 120 }}>
        <AlertCircle /><div style={{ marginTop: 8 }}>No se pudo cargar el servicio</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button className="btn" onClick={() => navigate('/servicios')}><ChevronsLeft size={15} /> Servicios</button>
          <button className="btn btn-primary" onClick={() => refetch()}><RefreshCw size={15} /> Reintentar</button>
        </div>
      </div>
    )
  }

  const activo = s.estado === 'activo'
  const img = s.imagenes?.[0]
  const imgUrl = img?.url ?? img?.url_medium ?? img?.url_thumb ?? null
  const precioFinal = s.precio_oferta ?? s.precio_venta
  const ganancia = precioFinal - s.inversion_estimada
  const margen = s.inversion_estimada > 0 ? (ganancia / s.inversion_estimada) * 100 : 0
  const margenTone = margen >= 100 ? 'pos' : margen >= 50 ? 'info' : margen >= 20 ? 'warn' : 'neg'

  return (
    <>
      <div className="page-head" style={{ alignItems: 'center' }}>
        <button className="back-link" onClick={() => navigate('/servicios')}><ChevronsLeft /> Servicios</button>
        <div className="hero-actions">
          <button className="btn" disabled={cambiarEstado.isPending} onClick={() => cambiarEstado.mutate(activo ? 'inactivo' : 'activo')}>
            {activo ? <><Ban size={15} /> Desactivar</> : <><CheckCircle2 size={15} /> Activar</>}
          </button>
          <button className="btn btn-primary" onClick={() => setEditar(true)}><Pencil size={15} /> Editar servicio</button>
        </div>
      </div>

      <div className="card prod-hero">
        <div className="prod-hero-img" onClick={() => imgUrl && setLightbox(imgUrl)} data-clickable={!!imgUrl}>
          {imgUrl ? <img src={imgUrl} alt={s.nombre} /> : <Boxes size={40} />}
        </div>
        <div className="prod-hero-info">
          <div className="prod-hero-sku">{s.codigo}</div>
          <div className="prod-hero-name">{s.nombre}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '10px 0' }}>
            <span className="badge" data-tone={activo ? 'pos' : undefined}><span className="b-dot" />{activo ? 'Activo' : 'Inactivo'}</span>
            {s.precio_oferta && <span className="badge" data-tone="violet"><span className="b-dot" />En oferta</span>}
          </div>
          {s.descripcion && <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>{s.descripcion}</p>}
        </div>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div className="kpi">
          <div className="kpi-row1"><div className="kpi-label">Inversión estimada</div><div className="kpi-icon" data-tone="info"><Wallet /></div></div>
          <div className="kpi-value tnum"><span className="currency">Q</span>{fmtMon(s.inversion_estimada)}</div>
          <div className="kpi-meta"><span>costo del servicio</span></div>
        </div>
        <div className="kpi">
          <div className="kpi-row1"><div className="kpi-label">Precio final</div><div className="kpi-icon" data-tone="accent"><Tag /></div></div>
          <div className="kpi-value tnum"><span className="currency">Q</span>{fmtMon(precioFinal)}</div>
          <div className="kpi-meta"><span>{s.precio_oferta ? `Normal: ${q(s.precio_venta)}` : 'sin oferta'}</span></div>
        </div>
        <div className="kpi">
          <div className="kpi-row1"><div className="kpi-label">Margen</div><div className="kpi-icon" data-tone={margenTone}><TrendingUp /></div></div>
          <div className="kpi-value tnum" style={{ color: `var(--${margenTone})` }}>{margen.toFixed(1)}%</div>
          <div className="kpi-meta"><span>{q(ganancia)} de ganancia</span></div>
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-col">
          <div className="card detail-tabs-card">
            <div className="card-header"><div className="card-title"><FileText size={15} style={{ color: 'var(--accent-text)' }} />Detalles</div></div>
            <div className="info-grid">
              <InfoItem icon={<Tag />} label="Código" value={s.codigo} />
              <InfoItem icon={<Wallet />} label="Inversión" value={q(s.inversion_estimada)} />
              <InfoItem icon={<Tag />} label="Precio venta" value={q(s.precio_venta)} />
              <InfoItem icon={<Tag />} label="Precio oferta" value={s.precio_oferta ? q(s.precio_oferta) : null} empty="Sin oferta" />
              <InfoItem icon={<FileText />} label="Descripción" value={s.descripcion} empty="Sin descripción" full />
              <InfoItem icon={<AlertCircle />} label="Notas internas" value={s.notas_internas} empty="Sin notas" full />
            </div>
          </div>
        </div>

        <div className="detail-col">
          <div className="card">
            <div className="card-header"><div className="card-title"><AlertCircle size={15} style={{ color: 'var(--text-muted)' }} />Registro</div></div>
            <div className="timeline">
              <TlItem icon={<CalendarDays />} label="Creado" value={s.created_at ? fmtFecha(s.created_at, true) : '—'} />
              <TlItem icon={<RefreshCw />} label="Actualizado" value={s.updated_at ? fmtFecha(s.updated_at, true) : '—'} />
            </div>
          </div>

          <div className="card">
            <div className="card-header"><div className="card-title"><AlertCircle size={15} style={{ color: 'var(--neg)' }} />Zona de riesgo</div></div>
            <div className="action-list">
              <button className="action-btn" data-variant="danger" onClick={() => setConfirmarEliminar(true)}><Trash2 /> Eliminar servicio</button>
            </div>
          </div>
        </div>
      </div>

      {lightbox && (
        <div onClick={() => setLightbox(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 95, background: 'rgba(0,0,0,.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <button className="icon-btn" onClick={() => setLightbox(null)} style={{ position: 'absolute', top: 16, right: 16, color: '#fff', width: 36, height: 36 }}><X size={20} /></button>
          <img src={lightbox} alt="" style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: 10 }} onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      <ServicioForm open={editar} onClose={() => setEditar(false)} servicio={s} />
      <ConfirmDialog open={confirmarEliminar} onOpenChange={setConfirmarEliminar}
        title="Eliminar servicio" description={`¿Eliminar "${s.nombre}"?`}
        confirmLabel="Eliminar" danger loading={eliminar.isPending} onConfirm={() => eliminar.mutate()} />
    </>
  )
}

function fmtMon(n: number): string {
  return Number(n).toLocaleString('es-GT', { minimumFractionDigits: 2 })
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
