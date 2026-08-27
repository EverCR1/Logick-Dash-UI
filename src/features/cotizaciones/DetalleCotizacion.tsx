import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Loader2, Eye, Download, User, CalendarDays, FileText, ShoppingCart,
  Copy, EyeOff, Lock, ArrowUpRight,
} from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { cotizacionesApi } from '@/lib/api'
import { q, fmtFecha } from '@/lib/format'
import { estadoVisible, diasRestantes } from './cotizacion-estados'
import { margenDeLinea, margenTotal } from './margen'
import { useState } from 'react'

/**
 * Vista de consulta de una cotización.
 *
 * Existe por dos razones. La primera es no tener que abrir el editor —una
 * pantalla hecha para mutar— solo para leer qué se cotizó. La segunda, y la que
 * de verdad la justifica: el PDF va al cliente, así que no puede llevar costos,
 * y sin esta vista el margen de una cotización no se podía consultar en ningún
 * sitio antes de mandarla.
 */
export function DetalleCotizacion({ open, onClose, cotizacionId }:
  { open: boolean; onClose: () => void; cotizacionId: number | null }) {

  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [verMargen, setVerMargen] = useState(false)

  const { data: c, isLoading } = useQuery({
    queryKey: ['cotizacion', cotizacionId],
    queryFn: () => cotizacionesApi.obtener(cotizacionId!),
    enabled: open && !!cotizacionId,
  })

  const duplicar = useMutation({
    mutationFn: async () => {
      if (!c) throw new Error('sin cotización')
      const hasta = new Date()
      hasta.setDate(hasta.getDate() + 15)
      return cotizacionesApi.crear({
        cliente_id: c.cliente_id,
        nombre_cliente: c.nombre_cliente,
        sucursal_id: c.sucursal_id,
        observaciones: c.observaciones,
        valido_hasta: `${hasta.getFullYear()}-${String(hasta.getMonth() + 1).padStart(2, '0')}-${String(hasta.getDate()).padStart(2, '0')}`,
        items: c.detalles.map((d) => ({
          tipo: d.tipo, cantidad: d.cantidad, descripcion: d.descripcion,
          precio_unitario: Number(d.precio_unitario),
          costo: d.costo != null ? Number(d.costo) : null,
          descuento: Number(d.descuento) || 0,
          producto_id: d.producto_id, servicio_id: d.servicio_id,
        })),
      })
    },
    onSuccess: (nueva) => {
      toast.success(`Duplicada como ${nueva.numero_cotizacion}`)
      queryClient.invalidateQueries({ queryKey: ['cotizaciones'] })
      onClose()
    },
    onError: () => toast.error('No se pudo duplicar'),
  })

  const previsualizar = async () => {
    if (!c) return
    const tab = window.open('', '_blank') // abrir en el gesto del click (evita bloqueo de pestañas)
    const { previsualizarCotizacion } = await import('./cotizacion-pdf')
    if (!(await previsualizarCotizacion(c, tab))) toast.error('No se pudo abrir el PDF')
  }
  const descargar = async () => {
    if (!c) return
    const { descargarCotizacion } = await import('./cotizacion-pdf')
    if (!(await descargarCotizacion(c))) toast.error('No se pudo generar el PDF')
  }

  const badge = c ? estadoVisible(c) : null
  const dias = c ? diasRestantes(c.valido_hasta) : 0
  const cerrada = c?.estado === 'convertida'
  const totales = c ? margenTotal(c.detalles) : null

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} size="lg"
      title={c ? `Cotización ${c.numero_cotizacion}` : 'Detalle de cotización'}
      description={c ? fmtFecha(c.created_at, true) : undefined}
      footer={<>
        <button type="button" className="btn" onClick={() => duplicar.mutate()} disabled={!c || duplicar.isPending}>
          {duplicar.isPending ? <Loader2 size={15} className="spin" /> : <Copy size={15} />} Duplicar
        </button>
        <button type="button" className="btn" onClick={previsualizar} disabled={!c}><Eye size={15} /> Previsualizar</button>
        <button type="button" className="btn" onClick={descargar} disabled={!c}><Download size={15} /> Descargar</button>
        {!cerrada && (
          <button type="button" className="btn btn-primary" disabled={!c}
            onClick={() => { onClose(); navigate(`/ventas/nueva?cotizacion=${c!.id}`) }}>
            <ShoppingCart size={15} /> Convertir en venta
          </button>
        )}
      </>}>
      {isLoading || !c ? (
        <div className="empty" style={{ padding: 40 }}><Loader2 size={22} className="spin" style={{ color: 'var(--accent)' }} /></div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span className="badge" data-tone={badge?.tone}><span className="b-dot" />{badge?.label}</span>
            <span className="badge">
              <CalendarDays size={11} />
              {cerrada ? `Cotizada hasta ${fmtFecha(c.valido_hasta)}`
                : dias > 0 ? `Vigente ${dias} día${dias === 1 ? '' : 's'} más`
                : dias === 0 ? 'Vence hoy' : `Venció hace ${-dias} día${-dias === 1 ? '' : 's'}`}
            </span>
          </div>

          {c.venta && (
            <button type="button" className="cot-venta-link"
              onClick={() => { onClose(); navigate(`/ventas?ver=${c.venta!.id}`) }}>
              <ShoppingCart size={14} />
              <span style={{ flex: 1, textAlign: 'left' }}>Se convirtió en la venta <strong>{c.venta.numero_venta}</strong></span>
              <ArrowUpRight size={14} />
            </button>
          )}

          <div className="info-grid">
            <InfoItem icon={<User />} label="Cliente" value={c.cliente?.nombre ?? c.nombre_cliente} empty="Sin especificar" />
            <InfoItem icon={<CalendarDays />} label="Válida hasta" value={fmtFecha(c.valido_hasta)} />
            <InfoItem icon={<User />} label="Vendedor" value={c.usuario ? `${c.usuario.nombres} ${c.usuario.apellidos}` : null} />
          </div>

          <table className="tbl">
            <thead>
              <tr>
                <th>Descripción</th>
                <th>Tipo</th>
                <th className="num">Precio</th>
                <th className="num">Cant.</th>
                <th className="num">Desc.</th>
                <th className="num">Total</th>
                {verMargen && <th className="num cot-interno">Costo</th>}
                {verMargen && <th className="num cot-interno">Margen</th>}
              </tr>
            </thead>
            <tbody>
              {c.detalles.map((d) => {
                const m = margenDeLinea(d)
                return (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 500 }}>{d.descripcion}</td>
                    <td className="muted" style={{ textTransform: 'capitalize' }}>{d.tipo}</td>
                    <td className="num tnum muted">{q(d.precio_unitario)}</td>
                    <td className="num tnum">{d.cantidad}</td>
                    <td className="num tnum muted">{Number(d.descuento) > 0 ? q(d.descuento) : '—'}</td>
                    <td className="num tnum" style={{ fontWeight: 600 }}>{q(d.total)}</td>
                    {verMargen && (
                      <td className="num tnum cot-interno muted">
                        {m.costoTotal !== null ? q(m.costoTotal) : '—'}
                      </td>
                    )}
                    {verMargen && (
                      <td className="num tnum cot-interno">
                        {m.ganancia !== null ? (
                          <span style={{ color: m.ganancia >= 0 ? 'var(--pos)' : 'var(--neg)' }}>
                            {q(m.ganancia)}
                            {m.porcentaje !== null && <span className="muted" style={{ fontSize: 11 }}> · {m.porcentaje.toFixed(0)}%</span>}
                          </span>
                        ) : <span className="muted">sin costo</span>}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>

          <div className="venta-totales">
            <div className="resumen-row"><span className="muted">Subtotal</span><span className="tnum">{q(c.subtotal)}</span></div>
            {Number(c.descuento_total) > 0 && (
              <div className="resumen-row"><span className="muted">Descuento</span><span className="tnum" style={{ color: 'var(--neg)' }}>− {q(c.descuento_total)}</span></div>
            )}
            <div className="resumen-total"><span>Total</span><span className="tnum">{q(c.total)}</span></div>
          </div>

          {/* Bloque interno: nunca sale en el PDF que ve el cliente */}
          <div className="cot-margen">
            <button type="button" className="cot-margen-toggle" onClick={() => setVerMargen((v) => !v)}>
              {verMargen ? <EyeOff size={14} /> : <Eye size={14} />}
              {verMargen ? 'Ocultar costos y margen' : 'Ver costos y margen'}
              <span className="cot-interno-tag"><Lock size={10} /> solo interno</span>
            </button>

            {verMargen && totales && (
              <div className="cot-margen-cifras">
                <div><span className="muted">Costo</span><span className="tnum">{q(totales.costo)}</span></div>
                <div>
                  <span className="muted">Ganancia</span>
                  <span className="tnum" style={{ color: totales.ganancia >= 0 ? 'var(--pos)' : 'var(--neg)' }}>{q(totales.ganancia)}</span>
                </div>
                <div>
                  <span className="muted">Margen</span>
                  <span className="tnum">{totales.porcentaje !== null ? `${totales.porcentaje.toFixed(1)}%` : '—'}</span>
                </div>
                {totales.sinCosto > 0 && (
                  <p className="cot-margen-nota">
                    {totales.sinCosto} línea{totales.sinCosto === 1 ? '' : 's'} sin costo registrado
                    {totales.sinCosto === 1 ? ' queda' : ' quedan'} fuera de este cálculo. El margen real es menor.
                  </p>
                )}
              </div>
            )}
          </div>

          {c.observaciones && (
            <div className="info-item full">
              <div className="il"><FileText size={13} /> Observaciones</div>
              <div className="iv" style={{ whiteSpace: 'pre-wrap' }}>{c.observaciones}</div>
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
