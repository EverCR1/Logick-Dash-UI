import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, Eye, Download, User, CalendarDays, CreditCard, FileText } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { ventasApi } from '@/lib/api'
import { q, fmtFecha } from '@/lib/format'
import { ESTADO_VENTA, METODO_LABEL, METODO_TONE } from './venta-estados'

export function DetalleVenta({ open, onClose, ventaId }: { open: boolean; onClose: () => void; ventaId: number | null }) {
  const { data: venta, isLoading } = useQuery({
    queryKey: ['venta', ventaId],
    queryFn: () => ventasApi.obtener(ventaId!),
    enabled: open && !!ventaId,
  })

  const badge = venta ? ESTADO_VENTA[venta.estado] : null

  const previsualizar = async () => {
    if (!venta) return
    const tab = window.open('', '_blank') // abrir en el gesto del click (evita bloqueo de pestañas)
    const { previsualizarComprobante } = await import('./comprobante')
    if (!(await previsualizarComprobante(venta, tab))) toast.error('No se pudo abrir el comprobante')
  }
  const descargar = async () => {
    if (!venta) return
    const { descargarComprobante } = await import('./comprobante')
    if (!(await descargarComprobante(venta))) toast.error('No se pudo generar el comprobante')
  }

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} size="lg"
      title={venta ? `Venta ${venta.numero_venta}` : 'Detalle de venta'}
      description={venta ? fmtFecha(venta.created_at, true) : undefined}
      footer={<>
        <button type="button" className="btn" onClick={previsualizar} disabled={!venta}><Eye size={15} /> Previsualizar</button>
        <button type="button" className="btn btn-primary" onClick={descargar} disabled={!venta}><Download size={15} /> Comprobante</button>
      </>}>
      {isLoading || !venta ? (
        <div className="empty" style={{ padding: 40 }}><Loader2 size={22} className="spin" style={{ color: 'var(--accent)' }} /></div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {/* Chips de estado */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span className="badge" data-tone={badge?.tone}><span className="b-dot" />{badge?.label}</span>
            <span className="badge" data-tone={METODO_TONE[venta.metodo_pago]}><CreditCard size={11} /> {METODO_LABEL[venta.metodo_pago] ?? venta.metodo_pago}</span>
          </div>

          {/* Info */}
          <div className="info-grid">
            <InfoItem icon={<User />} label="Cliente" value={venta.cliente?.nombre ?? 'Consumidor final'} />
            <InfoItem icon={<FileText />} label="NIT" value={venta.cliente?.nit ?? 'C/F'} />
            <InfoItem icon={<CalendarDays />} label="Fecha" value={fmtFecha(venta.created_at, true)} />
          </div>

          {/* Items */}
          <table className="tbl">
            <thead><tr><th>Descripción</th><th>Tipo</th><th className="num">Precio</th><th className="num">Cant.</th><th className="num">Desc.</th><th className="num">Total</th></tr></thead>
            <tbody>
              {venta.detalles.map((d) => (
                <tr key={d.id}>
                  <td style={{ fontWeight: 500 }}>{d.descripcion}</td>
                  <td className="muted" style={{ textTransform: 'capitalize' }}>{d.tipo}</td>
                  <td className="num tnum muted">{q(d.precio_unitario)}</td>
                  <td className="num tnum">{d.cantidad}</td>
                  <td className="num tnum muted">{Number(d.descuento) > 0 ? q(d.descuento) : '—'}</td>
                  <td className="num tnum" style={{ fontWeight: 600 }}>{q(d.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totales */}
          <div className="venta-totales">
            <div className="resumen-row"><span className="muted">Subtotal</span><span className="tnum">{q(venta.subtotal)}</span></div>
            {Number(venta.descuento_total) > 0 && <div className="resumen-row"><span className="muted">Descuento</span><span className="tnum" style={{ color: 'var(--neg)' }}>− {q(venta.descuento_total)}</span></div>}
            <div className="resumen-total"><span>Total</span><span className="tnum">{q(venta.total)}</span></div>
          </div>

          {venta.observaciones && (
            <div className="info-item full">
              <div className="il"><FileText size={13} /> Observaciones</div>
              <div className="iv" style={{ whiteSpace: 'pre-wrap' }}>{venta.observaciones}</div>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

function InfoItem({ icon, label, value, empty }: { icon: React.ReactNode; label: string; value?: string | null; empty?: string }) {
  return (
    <div className="info-item">
      <div className="il">{icon} {label}</div>
      <div className={'iv' + (value ? '' : ' empty')}>{value || empty || '—'}</div>
    </div>
  )
}
