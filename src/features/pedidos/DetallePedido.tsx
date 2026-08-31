import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { Loader2, ExternalLink } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { pedidosTiendaApi } from '@/lib/api'
import { q, fmtFecha } from '@/lib/format'
import { invalidarProductos } from '@/lib/cache'
import { ESTADO_PEDIDO, ESTADO_OPCIONES } from './pedido-estados'
import type { PedidoEstado } from '@/types/pedido'

export function DetallePedido({ open, onClose, pedidoId }: { open: boolean; onClose: () => void; pedidoId: number | null }) {
  const queryClient = useQueryClient()
  const [nuevoEstado, setNuevoEstado] = useState<PedidoEstado>('pendiente')

  const { data: pedido, isLoading } = useQuery({
    queryKey: ['pedido-tienda', pedidoId],
    queryFn: () => pedidosTiendaApi.obtener(pedidoId!),
    enabled: open && !!pedidoId,
  })

  useEffect(() => { if (pedido) setNuevoEstado(pedido.estado) }, [pedido])

  const cambiar = useMutation({
    mutationFn: () => pedidosTiendaApi.cambiarEstado(pedidoId!, nuevoEstado),
    onSuccess: () => {
      toast.success('Estado actualizado')
      queryClient.invalidateQueries({ queryKey: ['pedidos-tienda'] })
      queryClient.invalidateQueries({ queryKey: ['pedido-tienda', pedidoId] })
      // Cancelar o reactivar un pedido devuelve o vuelve a tomar stock
      invalidarProductos(queryClient)
    },
    onError: (err) => {
      if (isAxiosError(err) && err.response?.status === 422) toast.error(err.response.data?.message ?? 'No se pudo cambiar el estado')
      else toast.error('No se pudo cambiar el estado')
    },
  })

  const badge = pedido ? ESTADO_PEDIDO[pedido.estado] : null
  const cambioPendiente = pedido && nuevoEstado !== pedido.estado

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} size="lg"
      title={pedido ? `Pedido ${pedido.numero_pedido}` : 'Detalle del pedido'}
      footer={<button type="button" className="btn" onClick={onClose}>Cerrar</button>}>
      {isLoading || !pedido ? (
        <div className="empty" style={{ padding: 40 }}><Loader2 size={22} className="spin" style={{ color: 'var(--accent)' }} /></div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {/* Cabecera */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span className="badge" data-tone={badge?.tone}><span className="b-dot" />{badge?.label}</span>
            <span className="muted" style={{ fontSize: 12 }}>{fmtFecha(pedido.created_at, true)}</span>
          </div>

          {/* Cambiar estado */}
          <div className="card" style={{ padding: 14, display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="form-field" style={{ minWidth: 200, marginBottom: 0 }}>
              <label>Cambiar estado</label>
              <Select value={nuevoEstado} onValueChange={(v) => setNuevoEstado(v as PedidoEstado)} options={ESTADO_OPCIONES} />
            </div>
            <button className="btn btn-primary" disabled={!cambioPendiente || cambiar.isPending} onClick={() => cambiar.mutate()}>
              {cambiar.isPending && <Loader2 size={14} className="spin" />}Aplicar
            </button>
          </div>

          {/* Datos de contacto y entrega */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            <Seccion titulo="Cliente">
              <Dato label="Nombre" valor={pedido.nombre} />
              <Dato label="Email" valor={pedido.email} />
              <Dato label="Teléfono" valor={pedido.telefono} />
            </Seccion>
            <Seccion titulo="Entrega">
              <Dato label="Tipo" valor={pedido.tipo_entrega} cap />
              <Dato label="Dirección" valor={[pedido.direccion, pedido.municipio, pedido.departamento].filter(Boolean).join(', ') || null} />
              <Dato label="Referencias" valor={pedido.referencias} />
            </Seccion>
          </div>

          {/* Items */}
          <div>
            <div style={{ fontWeight: 600, fontSize: 12.5, marginBottom: 8 }}>Productos</div>
            <table className="tbl">
              <thead><tr><th>Producto</th><th className="num">Precio</th><th className="num">Cant.</th><th className="num">Subtotal</th></tr></thead>
              <tbody>
                {pedido.detalles.map((d) => (
                  <tr key={d.id}>
                    <td>{d.nombre_producto}</td>
                    <td className="num tnum muted">{q(d.precio_unitario)}</td>
                    <td className="num tnum">{d.cantidad}</td>
                    <td className="num tnum" style={{ fontWeight: 600 }}>{q(d.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: 10, marginLeft: 'auto', maxWidth: 260, display: 'grid', gap: 4, fontSize: 12.5 }}>
              <Linea label="Subtotal" valor={q(pedido.subtotal)} />
              {pedido.descuento_cupon > 0 && <Linea label="Descuento cupón" valor={`- ${q(pedido.descuento_cupon)}`} />}
              <Linea label="Envío" valor={q(pedido.costo_envio)} />
              <Linea label="Total" valor={q(pedido.total)} destacado />
              {pedido.puntos_ganados > 0 && <Linea label="Puntos ganados" valor={String(pedido.puntos_ganados)} />}
            </div>
          </div>

          {/* Comprobante de pago */}
          <div>
            <div style={{ fontWeight: 600, fontSize: 12.5, marginBottom: 8 }}>
              Comprobante de pago <span className="muted" style={{ fontWeight: 400, textTransform: 'capitalize' }}>· {(pedido.metodo_pago ?? '—').replace('_', ' ')}</span>
            </div>
            {pedido.comprobante_url ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
                <img src={pedido.comprobante_url} alt="Comprobante de pago"
                  style={{ maxWidth: '100%', maxHeight: 360, borderRadius: 8, border: '1px solid var(--border)' }} />
                <a className="btn" href={pedido.comprobante_url} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Abrir en tamaño completo</a>
              </div>
            ) : (
              <div className="muted" style={{ fontSize: 12.5 }}>Sin comprobante adjunto.</div>
            )}
          </div>

          {(pedido.notas || pedido.notas_internas) && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
              {pedido.notas && <Seccion titulo="Notas del cliente"><div style={{ fontSize: 12.5, whiteSpace: 'pre-wrap' }}>{pedido.notas}</div></Seccion>}
              {pedido.notas_internas && <Seccion titulo="Notas internas"><div style={{ fontSize: 12.5, whiteSpace: 'pre-wrap' }}>{pedido.notas_internas}</div></Seccion>}
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: 600, marginBottom: 6 }}>{titulo}</div>
      <div style={{ display: 'grid', gap: 4 }}>{children}</div>
    </div>
  )
}

function Dato({ label, valor, cap }: { label: string; valor: string | null; cap?: boolean }) {
  return (
    <div style={{ fontSize: 12.5 }}>
      <span className="muted">{label}: </span>
      <span style={cap ? { textTransform: 'capitalize' } : undefined}>{valor || '—'}</span>
    </div>
  )
}

function Linea({ label, valor, destacado }: { label: string; valor: string; destacado?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: destacado ? 700 : 400, fontSize: destacado ? 14 : 12.5, paddingTop: destacado ? 4 : 0, borderTop: destacado ? '1px solid var(--border)' : undefined }}>
      <span className={destacado ? undefined : 'muted'}>{label}</span>
      <span className="tnum">{valor}</span>
    </div>
  )
}
