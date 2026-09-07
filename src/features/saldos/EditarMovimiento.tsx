import { useState, useEffect, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { saldosApi } from '@/lib/api'
import { q } from '@/lib/format'
import type { MovimientoSaldo } from '@/types/saldo'

/**
 * Corrige lo que no mueve dinero de un movimiento: su concepto y su fecha.
 *
 * El monto no se edita a propósito. El saldo del cliente se calcula sumando
 * estos movimientos, así que cambiar un importe lo alteraría hacia atrás sin
 * dejar rastro de que hubo un error —y si ese dinero ya se aplicó a una venta,
 * dejaría el libro descuadrado—. Un importe equivocado se corrige con un ajuste.
 */
export function EditarMovimiento({ movimiento, onClose }: {
  movimiento: MovimientoSaldo | null
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [concepto, setConcepto] = useState('')
  const [fecha, setFecha] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!movimiento) return
    setConcepto(movimiento.concepto ?? '')
    setFecha(movimiento.fecha?.slice(0, 10) ?? '')
    setError('')
  }, [movimiento])

  const guardar = useMutation({
    mutationFn: () => saldosApi.actualizar(movimiento!.id, { concepto: concepto.trim(), fecha }),
    onSuccess: () => {
      toast.success('Movimiento actualizado')
      for (const key of [['saldos'], ['saldo-cliente']]) {
        queryClient.invalidateQueries({ queryKey: key })
      }
      onClose()
    },
    onError: () => toast.error('No se pudo actualizar el movimiento'),
  })

  const onSubmit = (ev: FormEvent) => {
    ev.preventDefault()
    if (concepto.trim().length < 3) { setError('Anota de qué es este movimiento'); return }
    guardar.mutate()
  }

  if (!movimiento) return null

  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title="Editar movimiento"
      footer={<>
        <button type="button" className="btn" onClick={onClose} disabled={guardar.isPending}>Cancelar</button>
        <button type="submit" form="editar-mov" className="btn btn-primary" disabled={guardar.isPending}>
          {guardar.isPending && <Loader2 size={14} className="spin" />}Guardar cambios
        </button>
      </>}>
      <form id="editar-mov" onSubmit={onSubmit} className="form-grid">
        <div className="form-field col-2">
          <div className="rc-line">
            <span className="lbl">Monto</span>
            <span className="val tnum">{q(Math.abs(Number(movimiento.monto)))}</span>
          </div>
          <span className="form-hint">
            El monto no se edita: cambiaría el saldo hacia atrás sin dejar rastro. Si está
            equivocado, ciérralo con un ajuste desde la ficha del cliente.
          </span>
        </div>

        <div className="form-field">
          <label>Fecha<span className="req"> *</span></label>
          <input className="form-input" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>

        <div className="form-field col-2">
          <label>Concepto<span className="req"> *</span></label>
          <textarea className="form-textarea" value={concepto}
            onChange={(e) => { setConcepto(e.target.value); setError('') }} aria-invalid={!!error} />
          {error && <span className="form-error">{error}</span>}
        </div>
      </form>
    </Modal>
  )
}
