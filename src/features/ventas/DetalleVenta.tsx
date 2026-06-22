import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { ventasApi } from '@/lib/api'
import { q, fmtFecha } from '@/lib/format'
import { ESTADO_VENTA, METODO_LABEL } from './venta-estados'

export function DetalleVenta({ open, onClose, ventaId }: { open: boolean; onClose: () => void; ventaId: number | null }) {
  const { data: venta, isLoading } = useQuery({
    queryKey: ['venta', ventaId],
    queryFn: () => ventasApi.obtener(ventaId!),
    enabled: open && !!ventaId,
  })

  const badge = venta ? ESTADO_VENTA[venta.estado] : null

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} size="lg"
      title={venta ? `Venta ${venta.numero_venta}` : 'Detalle de venta'}
      footer={<button type="button" className="btn" onClick={onClose}>Cerrar</button>}>
      {isLoading || !venta ? (
        <div className="empty" style={{ padding: 40 }}><Loader2 size={22} className="spin" style={{ color: 'var(--accent)' }} /></div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span className="badge" data-tone={badge?.tone}><span className="b-dot" />{badge?.label}</span>
            <span className="badge"><span className="b-dot" />{METODO_LABEL[venta.metodo_pago] ?? venta.metodo_pago}</span>
            <span className="muted" style={{ fontSize: 12 }}>{fmtFecha(venta.created_at, true)}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, fontSize: 12.5 }}>
            <div><span className="muted">Cliente: </span>{venta.cliente?.nombre ?? 'Consumidor final'}</div>
            {venta.cliente?.nit && <div><span className="muted">NIT: </span>{venta.cliente.nit}</div>}
            {venta.usuario && <div><span className="muted">Vendedor: </span>{`${venta.usuario.nombres ?? ''} ${venta.usuario.apellidos ?? ''}`.trim() || '—'}</div>}
          </div>

          <table className="tbl">
            <thead><tr><th>Descripción</th><th>Tipo</th><th className="num">Precio</th><th className="num">Cant.</th><th className="num">Desc.</th><th className="num">Total</th></tr></thead>
            <tbody>
              {venta.detalles.map((d) => (
                <tr key={d.id}>
                  <td>{d.descripcion}</td>
                  <td className="muted" style={{ textTransform: 'capitalize' }}>{d.tipo}</td>
                  <td className="num tnum muted">{q(d.precio_unitario)}</td>
                  <td className="num tnum">{d.cantidad}</td>
                  <td className="num tnum muted">{Number(d.descuento) > 0 ? q(d.descuento) : '—'}</td>
                  <td className="num tnum" style={{ fontWeight: 600 }}>{q(d.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginLeft: 'auto', maxWidth: 260, display: 'grid', gap: 4, fontSize: 12.5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="muted">Subtotal</span><span className="tnum">{q(venta.subtotal)}</span></div>
            {Number(venta.descuento_total) > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="muted">Descuento</span><span className="tnum">- {q(venta.descuento_total)}</span></div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 14, paddingTop: 4, borderTop: '1px solid var(--border)' }}><span>Total</span><span className="tnum">{q(venta.total)}</span></div>
          </div>

          {venta.observaciones && (
            <div>
              <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: 600, marginBottom: 4 }}>Observaciones</div>
              <div style={{ fontSize: 12.5, whiteSpace: 'pre-wrap' }}>{venta.observaciones}</div>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
