import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Loader2, ChevronsLeft, Pencil, Trash2, Wallet, Receipt, CalendarDays, Clock,
  RefreshCw, AlertCircle, CheckCircle, Coins, HandCoins, FileText,
} from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { CreditoForm } from './CreditoForm'
import { RegistrarPago } from './RegistrarPago'
import { creditosApi } from '@/lib/api'
import { q, fmtN, fmtFecha } from '@/lib/format'
import type { CreditoEstado } from '@/types/credito'
import { inicialesNombre } from '@/lib/text'

const ESTADO_BADGE: Record<CreditoEstado, { label: string; tone?: 'pos' | 'neg' | 'warn' }> = {
  activo: { label: 'Activo', tone: 'warn' },
  abonado: { label: 'Abonado' },
  pagado: { label: 'Pagado', tone: 'pos' },
}

export default function CreditoDetalle() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [editar, setEditar] = useState(false)
  const [pagar, setPagar] = useState(false)
  const [confirmarEliminar, setConfirmarEliminar] = useState(false)

  const { data: credito, isLoading, isError, refetch } = useQuery({
    queryKey: ['credito', id],
    queryFn: () => creditosApi.obtener(Number(id)),
    enabled: !!id,
  })

  const eliminar = useMutation({
    mutationFn: () => creditosApi.eliminar(Number(id)),
    onSuccess: () => {
      toast.success('Crédito eliminado')
      for (const key of [['creditos'], ['dashboard'], ['dashboard-serie'], ['ventas'], ['rep-resumen'], ['rep-ganancias']]) {
        queryClient.invalidateQueries({ queryKey: key })
      }
      navigate('/creditos')
    },
    onError: () => toast.error('No se pudo eliminar el crédito'),
  })

  if (isLoading) {
    return <div className="empty" style={{ padding: 120 }}><Loader2 size={26} className="spin" style={{ color: 'var(--accent)' }} /><div>Cargando crédito…</div></div>
  }
  if (isError || !credito) {
    return (
      <div className="empty" style={{ padding: 120 }}>
        <AlertCircle /><div style={{ marginTop: 8 }}>No se pudo cargar el crédito</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button className="btn" onClick={() => navigate('/creditos')}><ChevronsLeft size={15} /> Créditos</button>
          <button className="btn btn-primary" onClick={() => refetch()}><RefreshCw size={15} /> Reintentar</button>
        </div>
      </div>
    )
  }

  const capital = Number(credito.capital) || 0
  const restante = Number(credito.capital_restante) || 0
  const pagado = capital - restante
  const pct = capital > 0 ? Math.round((pagado / capital) * 100) : 0
  const badge = ESTADO_BADGE[credito.estado]
  const liquidado = credito.estado === 'pagado'

  return (
    <>
      <div className="page-head" style={{ alignItems: 'center' }}>
        <button className="back-link" onClick={() => navigate('/creditos')}><ChevronsLeft /> Créditos</button>
        <div className="hero-actions">
          {!liquidado && <button className="btn btn-primary" onClick={() => setPagar(true)}><Wallet size={15} /> Registrar pago</button>}
          <button className="btn" onClick={() => setEditar(true)}><Pencil size={15} /> Editar</button>
        </div>
      </div>

      <div className="card profile-header">
        <div className="profile-avatar">{inicialesNombre(credito.nombre_cliente)}</div>
        <div className="profile-id">
          <div className="profile-name-row">
            <span className="profile-name">{credito.nombre_cliente}</span>
            <span className="badge" data-tone={badge.tone}><span className="b-dot" />{badge.label}</span>
            {credito.venta_id && (
              <Link to={`/ventas?ver=${credito.venta_id}`} className="link-venta" title="Ver venta vinculada">
                <Receipt size={12} /> Venta #{credito.venta_id}
              </Link>
            )}
          </div>
          <div className="profile-contact">
            {credito.producto_o_servicio_dado && <span className="pc"><FileText />{credito.producto_o_servicio_dado}</span>}
            <span className="pc"><CalendarDays />{fmtFecha(credito.fecha_credito)}</span>
          </div>
        </div>
      </div>

      {/* Progreso */}
      <div className="card" style={{ padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12.5 }}>
          <span className="muted">{pct}% pagado</span>
          <span className="muted tnum">{q(pagado)} de {q(capital)}</span>
        </div>
        <div style={{ height: 8, background: 'var(--bg-elev-2)', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: pct >= 100 ? 'var(--pos)' : 'var(--accent)', transition: 'width .4s ease' }} />
        </div>
      </div>

      <div className="kpi-grid">
        <Kpi label="Capital total" value={fmtN(capital)} currency="Q" icon={Coins} tone="accent" sub="prestado" />
        <Kpi label="Capital restante" value={fmtN(restante)} currency="Q" icon={Wallet} tone={liquidado ? 'pos' : 'neg'} sub={liquidado ? 'liquidado' : 'por cobrar'} />
        <Kpi label="Pagado" value={fmtN(pagado)} currency="Q" icon={CheckCircle} tone="pos" sub={`${pct}% del total`} />
        <Kpi label="Pagos registrados" value={fmtN(credito.pagos.length)} icon={HandCoins} tone="info" sub="movimientos" />
      </div>

      <div className="detail-grid">
        <div className="detail-col">
          <div className="card detail-tabs-card">
            <div className="card-header"><div className="card-title"><HandCoins size={15} style={{ color: 'var(--text-muted)' }} />Historial de pagos</div></div>
            {credito.pagos.length > 0 ? (
              <table className="tbl">
                <thead><tr><th className="num" style={{ width: 48 }}>No.</th><th>Fecha</th><th>Tipo</th><th className="num">Monto</th><th>Observaciones</th></tr></thead>
                <tbody>
                  {credito.pagos.map((p, i) => (
                    <tr key={p.id}>
                      <td className="num muted tnum">{i + 1}</td>
                      <td className="muted" style={{ fontSize: 12 }}>{fmtFecha(p.fecha_pago)}</td>
                      <td><span className="badge" data-tone={p.tipo === 'pago_total' ? 'pos' : undefined}><span className="b-dot" />{p.tipo === 'pago_total' ? 'Pago total' : 'Abono'}</span></td>
                      <td className="num tnum" style={{ fontWeight: 600 }}>{q(p.monto)}</td>
                      <td className="muted" style={{ fontSize: 12 }}>{p.observaciones || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty" style={{ padding: 50 }}>
                <HandCoins /><div>Aún no hay pagos registrados.</div>
                {!liquidado && <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={() => setPagar(true)}><Wallet size={15} /> Registrar primer pago</button>}
              </div>
            )}
          </div>
        </div>

        <div className="detail-col">
          <div className="card">
            <div className="card-header"><div className="card-title"><Clock size={15} style={{ color: 'var(--text-muted)' }} />Información</div></div>
            <div className="info-grid">
              <InfoItem icon={<CalendarDays />} label="Fecha del crédito" value={fmtFecha(credito.fecha_credito)} />
              <InfoItem icon={<Clock />} label="Último pago" value={credito.fecha_ultimo_pago ? fmtFecha(credito.fecha_ultimo_pago) : null} empty="Sin pagos" />
              <InfoItem icon={<Wallet />} label="Última cantidad" value={credito.ultima_cantidad_pagada ? q(credito.ultima_cantidad_pagada) : null} empty="—" />
              <InfoItem icon={<Receipt />} label="Venta vinculada"
                value={credito.venta_id ? `#${credito.venta_id}` : null} empty="Sin venta"
                to={credito.venta_id ? `/ventas?ver=${credito.venta_id}` : undefined} />
            </div>
          </div>

          <div className="card">
            <div className="card-header"><div className="card-title"><AlertCircle size={15} style={{ color: 'var(--neg)' }} />Zona de riesgo</div></div>
            <div className="action-list">
              <button className="action-btn" data-variant="danger" onClick={() => setConfirmarEliminar(true)}><Trash2 /> Eliminar crédito</button>
              <div style={{ fontSize: 11.5, color: 'var(--text-faint)', padding: '0 2px', lineHeight: 1.5 }}>
                Se eliminarán también todos los pagos registrados.
              </div>
            </div>
          </div>
        </div>
      </div>

      <CreditoForm open={editar} onClose={() => setEditar(false)} credito={credito} />
      <RegistrarPago open={pagar} onClose={() => setPagar(false)} credito={credito} />
      <ConfirmDialog open={confirmarEliminar} onOpenChange={setConfirmarEliminar}
        title="Eliminar crédito" description={`¿Eliminar el crédito de "${credito.nombre_cliente}"? Se borrarán también sus pagos.`}
        confirmLabel="Eliminar" danger loading={eliminar.isPending} onConfirm={() => eliminar.mutate()} />
    </>
  )
}

function Kpi({ label, value, currency, icon: IconC, tone, sub }: {
  label: string; value: string; currency?: string; icon: React.ComponentType; tone: 'accent' | 'pos' | 'neg' | 'info' | 'warn' | 'violet'; sub: string
}) {
  return (
    <div className="kpi">
      <div className="kpi-row1"><div className="kpi-label">{label}</div><div className="kpi-icon" data-tone={tone}><IconC /></div></div>
      <div className="kpi-value tnum">{currency && <span className="currency">{currency}</span>}{value}</div>
      <div className="kpi-meta"><span>{sub}</span></div>
    </div>
  )
}

function InfoItem({ icon, label, value, empty, to }: { icon: React.ReactNode; label: string; value?: string | null; empty?: string; to?: string }) {
  return (
    <div className="info-item">
      <div className="il">{icon} {label}</div>
      {value && to
        ? <Link to={to} className="link-venta iv">{value}</Link>
        : <div className={'iv' + (value ? '' : ' empty')}>{value || empty || '—'}</div>}
    </div>
  )
}
