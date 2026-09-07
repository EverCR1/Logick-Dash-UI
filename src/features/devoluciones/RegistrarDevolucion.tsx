import { useState, useEffect, useMemo, type FormEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { Loader2, Minus, Plus, PackageX } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { devolucionesApi } from '@/lib/api'
import { invalidarProductos } from '@/lib/cache'
import { q, fechaLocal } from '@/lib/format'
import type { MetodoReembolso } from '@/types/devolucion'

/** A dónde va lo devuelto que no se aplicó a la deuda. */
type Destino = 'efectivo' | 'saldo'

/** Cantidad y destino de una línea que se está devolviendo. */
interface Seleccion {
  cantidad: number
  vuelveAInventario: boolean
}

/**
 * Registra una devolución sobre una venta emitida.
 *
 * Las cantidades se topan contra lo que queda por devolver, no contra lo vendido:
 * de 5 vendidas con 2 ya devueltas solo se ofrecen 3, para que el formulario no
 * proponga algo que la API va a rechazar.
 */
export function RegistrarDevolucion({ ventaId, onClose }: { ventaId: number | null; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [sel, setSel] = useState<Record<number, Seleccion>>({})
  const [motivo, setMotivo] = useState('')
  const [fecha, setFecha] = useState(fechaLocal())
  const [metodo, setMetodo] = useState<MetodoReembolso>('efectivo')
  const [destino, setDestino] = useState<Destino>('efectivo')
  const [error, setError] = useState('')

  const { data, isLoading, isError, error: errObj } = useQuery({
    queryKey: ['devolvible', ventaId],
    queryFn: () => devolucionesApi.devolvible(ventaId!),
    enabled: ventaId !== null,
    staleTime: 0,
    retry: false,
  })

  useEffect(() => {
    if (ventaId === null) return
    setSel({}); setMotivo(''); setFecha(fechaLocal()); setMetodo('efectivo'); setDestino('efectivo'); setError('')
  }, [ventaId])

  const lineas = data?.lineas.filter((l) => l.devolvible > 0) ?? []
  const deuda = Number(data?.deuda_pendiente ?? 0)

  const total = useMemo(
    () => lineas.reduce((s, l) => s + (sel[l.venta_detalle_id]?.cantidad ?? 0) * Number(l.precio_unitario), 0),
    [lineas, sel],
  )

  // Mismo reparto que hace la API: primero se salda deuda, el sobrante sale en
  // efectivo. Se calcula aquí para que el vendedor vea a dónde va el dinero
  // antes de confirmar, no después.
  const aDeuda = Math.min(total, deuda)
  const aCaja = Math.round((total - aDeuda) * 100) / 100

  const ajustar = (id: number, max: number, delta: number) => {
    setError('')
    setSel((s) => {
      const actual = s[id] ?? { cantidad: 0, vuelveAInventario: true }
      const cantidad = Math.max(0, Math.min(max, actual.cantidad + delta))
      return { ...s, [id]: { ...actual, cantidad } }
    })
  }

  const alternarInventario = (id: number) => {
    setSel((s) => {
      const actual = s[id] ?? { cantidad: 0, vuelveAInventario: true }
      return { ...s, [id]: { ...actual, vuelveAInventario: !actual.vuelveAInventario } }
    })
  }

  const guardar = useMutation({
    mutationFn: () => devolucionesApi.crear({
      venta_id: ventaId!,
      lineas: lineas
        .filter((l) => (sel[l.venta_detalle_id]?.cantidad ?? 0) > 0)
        .map((l) => ({
          venta_detalle_id: l.venta_detalle_id,
          cantidad: sel[l.venta_detalle_id].cantidad,
          vuelve_a_inventario: sel[l.venta_detalle_id].vuelveAInventario,
        })),
      fecha,
      motivo: motivo.trim(),
      destino,
      metodo_reembolso: aCaja > 0 && destino === 'efectivo' ? metodo : null,
    }),
    onSuccess: (dev) => {
      // Un resumen por cada destino que realmente recibió algo
      const partes = [
        Number(dev.aplicado_a_deuda) > 0 && `${q(dev.aplicado_a_deuda)} a la deuda`,
        Number(dev.reembolsado) > 0 && `${q(dev.reembolsado)} devueltos`,
        Number(dev.aplicado_a_saldo) > 0 && `${q(dev.aplicado_a_saldo)} a su favor`,
      ].filter(Boolean)
      toast.success(`Devolución ${dev.numero_devolucion}: ${partes.join(' y ')}`)
      // Toca ingreso reconocido, cartera, saldo y stock a la vez
      for (const key of [['devoluciones'], ['ventas'], ['creditos'], ['saldos'], ['saldo-cliente'], ['dashboard'], ['dashboard-serie'], ['rep-resumen'], ['rep-ganancias']]) {
        queryClient.invalidateQueries({ queryKey: key })
      }
      invalidarProductos(queryClient)
      onClose()
    },
    onError: (err) => {
      if (isAxiosError(err) && err.response?.status === 422) {
        setError(err.response.data?.errors?.motivo?.[0] ?? err.response.data?.message ?? 'Revisa los datos')
      } else toast.error('No se pudo registrar la devolución')
    },
  })

  const onSubmit = (ev: FormEvent) => {
    ev.preventDefault()
    if (total <= 0) { setError('Indica al menos una unidad a devolver'); return }
    if (motivo.trim().length < 3) { setError('Explica por qué se devuelve'); return }
    guardar.mutate()
  }

  if (ventaId === null) return null

  const mensajeError = isAxiosError(errObj) ? errObj.response?.data?.message : null

  return (
    <Modal open onOpenChange={(o) => !o && onClose()}
      title={data ? `Devolución sobre ${data.venta.numero_venta}` : 'Registrar devolución'}
      footer={<>
        <button type="button" className="btn" onClick={onClose} disabled={guardar.isPending}>Cancelar</button>
        <button type="submit" form="devolucion-form" className="btn btn-primary"
          disabled={guardar.isPending || isLoading || total <= 0}>
          {guardar.isPending && <Loader2 size={14} className="spin" />}
          Registrar devolución
        </button>
      </>}>

      {isLoading ? (
        <div className="empty" style={{ padding: 40 }}><Loader2 size={22} className="spin" /></div>
      ) : isError ? (
        <div className="empty" style={{ padding: 32 }}>{mensajeError ?? 'No se pudo cargar la venta'}</div>
      ) : lineas.length === 0 ? (
        <div className="empty" style={{ padding: 32 }}>
          <PackageX size={22} />
          <div style={{ marginTop: 8 }}>Esta venta ya se devolvió por completo.</div>
        </div>
      ) : (
        <form id="devolucion-form" onSubmit={onSubmit} className="form-grid">

          <div className="form-field col-2">
            <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
              <table className="tbl">
                <thead><tr>
                  <th>Artículo</th>
                  <th className="num">Pagado c/u</th>
                  <th style={{ width: 130, textAlign: 'center' }}>Devolver</th>
                  <th style={{ width: 120 }}>Inventario</th>
                  <th className="num">Subtotal</th>
                </tr></thead>
                <tbody>
                  {lineas.map((l) => {
                    const s = sel[l.venta_detalle_id] ?? { cantidad: 0, vuelveAInventario: true }
                    return (
                      <tr key={l.venta_detalle_id}>
                        <td>
                          <div style={{ fontWeight: 500 }}>{l.descripcion}</div>
                          <div className="muted" style={{ fontSize: 11.5 }}>
                            {l.cantidad_devuelta > 0
                              ? `${l.devolvible} de ${l.cantidad_vendida} sin devolver`
                              : `${l.cantidad_vendida} vendidas`}
                          </div>
                        </td>
                        <td className="num tnum">{q(l.precio_unitario)}</td>
                        <td>
                          <div className="qty-stepper">
                            <button type="button" className="icon-btn" disabled={s.cantidad === 0}
                              onClick={() => ajustar(l.venta_detalle_id, l.devolvible, -1)}><Minus size={13} /></button>
                            <span className="tnum" style={{ minWidth: 26, textAlign: 'center' }}>{s.cantidad}</span>
                            <button type="button" className="icon-btn" disabled={s.cantidad >= l.devolvible}
                              onClick={() => ajustar(l.venta_detalle_id, l.devolvible, 1)}><Plus size={13} /></button>
                          </div>
                        </td>
                        <td>
                          {l.tipo === 'producto' ? (
                            <label className="form-check" style={{ fontSize: 12 }}
                              title="Desmárcalo si viene defectuoso: se reembolsa igual pero no vuelve al catálogo">
                              <input type="checkbox" checked={s.vuelveAInventario} disabled={s.cantidad === 0}
                                onChange={() => alternarInventario(l.venta_detalle_id)} />
                              {s.vuelveAInventario ? 'Vuelve' : 'Defectuoso'}
                            </label>
                          ) : <span className="muted" style={{ fontSize: 11.5 }}>—</span>}
                        </td>
                        <td className="num tnum">{q(s.cantidad * Number(l.precio_unitario))}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* A dónde va el dinero: se resuelve antes de confirmar, no después */}
          <div className="form-field col-2">
            <div className="rc-line"><span className="lbl">Total a devolver</span><span className="val tnum">{q(total)}</span></div>
            {deuda > 0 && (
              <>
                <div className="rc-line">
                  <span className="lbl">Baja la deuda del crédito</span>
                  <span className="val tnum">{q(aDeuda)}</span>
                </div>
                <div className="rc-line">
                  <span className="lbl">Sale de la caja</span>
                  <span className="val tnum">{q(aCaja)}</span>
                </div>
                <span className="form-hint">
                  Primero se salda la deuda pendiente ({q(deuda)}); solo el sobrante se reembolsa.
                </span>
              </>
            )}
          </div>

          {aCaja > 0 && (
            <div className="form-field col-2">
              <label>Qué pasa con {q(aCaja)}</label>
              <Select value={destino} onValueChange={(v) => setDestino(v as Destino)} ariaLabel="Destino de la devolución"
                options={[
                  { value: 'efectivo', label: 'Se le devuelve el dinero' },
                  ...(data?.admite_saldo
                    ? [{ value: 'saldo', label: 'Queda a su favor para otra compra' }]
                    : []),
                ]} />
              {!data?.admite_saldo && (
                <span className="form-hint">
                  Para dejarlo a cuenta, la venta tiene que tener un cliente identificado.
                </span>
              )}
              {destino === 'saldo' && (
                <span className="form-hint">
                  Su saldo pasará de {q(Number(data?.saldo_actual ?? 0))} a {q(Number(data?.saldo_actual ?? 0) + aCaja)}.
                </span>
              )}
            </div>
          )}

          {aCaja > 0 && destino === 'efectivo' && (
            <div className="form-field">
              <label>Reembolso por</label>
              <Select value={metodo} onValueChange={(v) => setMetodo(v as MetodoReembolso)} ariaLabel="Método de reembolso"
                options={[
                  { value: 'efectivo', label: 'Efectivo' },
                  { value: 'tarjeta', label: 'Tarjeta' },
                  { value: 'transferencia', label: 'Transferencia' },
                ]} />
            </div>
          )}

          <div className="form-field">
            <label>Fecha</label>
            <input className="form-input" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>

          <div className="form-field col-2">
            <label>Motivo<span className="req"> *</span></label>
            <textarea className="form-textarea" value={motivo} placeholder="Ej.: producto defectuoso, no era lo que esperaba…"
              onChange={(e) => { setMotivo(e.target.value); setError('') }} aria-invalid={!!error} />
            {error && <span className="form-error">{error}</span>}
          </div>
        </form>
      )}
    </Modal>
  )
}
