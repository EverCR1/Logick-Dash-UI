import { useState, useEffect, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { creditosApi } from '@/lib/api'
import { q, fmtFecha } from '@/lib/format'
import type { PagoCredito } from '@/types/credito'

/**
 * Deshace un abono sin borrarlo.
 *
 * El ingreso de cada mes se calcula leyendo los abonos por su fecha, así que
 * borrar uno de marzo cambiaría hoy el ingreso de marzo. La reversión conserva
 * el original y anota la salida con la fecha de hoy: el mes cobrado mantiene su
 * cifra y el reintegro aparece en el mes en que de verdad ocurrió.
 */
export function RevertirPago({ creditoId, pago, onClose }: {
  creditoId: number
  pago: PagoCredito | null
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState('')

  useEffect(() => { if (pago) { setMotivo(''); setError('') } }, [pago])

  const revertir = useMutation({
    mutationFn: () => creditosApi.revertirPago(creditoId, pago!.id, motivo.trim()),
    onSuccess: () => {
      toast.success('Abono revertido')
      // Cambia el saldo del crédito y el ingreso reconocido de hoy
      for (const key of [['creditos'], ['credito'], ['dashboard'], ['dashboard-serie'], ['rep-resumen'], ['rep-ganancias']]) {
        queryClient.invalidateQueries({ queryKey: key })
      }
      onClose()
    },
    onError: (err) => {
      if (isAxiosError(err) && [404, 422].includes(err.response?.status ?? 0)) {
        setError(err.response?.data?.errors?.motivo?.[0] ?? err.response?.data?.message ?? 'No se pudo revertir')
      } else toast.error('No se pudo revertir el abono')
    },
  })

  const onSubmit = (ev: FormEvent) => {
    ev.preventDefault()
    if (motivo.trim().length < 3) { setError('Explica por qué se revierte este abono'); return }
    revertir.mutate()
  }

  if (!pago) return null

  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title="Revertir abono"
      footer={<>
        <button type="button" className="btn" onClick={onClose} disabled={revertir.isPending}>Cancelar</button>
        <button type="submit" form="revertir-pago" className="btn btn-primary" disabled={revertir.isPending}>
          {revertir.isPending && <Loader2 size={14} className="spin" />}Revertir abono
        </button>
      </>}>
      <form id="revertir-pago" onSubmit={onSubmit} className="form-grid">
        <div className="form-field col-2">
          <div className="rc-line">
            <span className="lbl">Abono del {fmtFecha(pago.fecha_pago)}</span>
            <span className="val tnum">{q(pago.monto)}</span>
          </div>
          <span className="form-hint">
            El abono original no se borra. Se registra su salida con la fecha de hoy, para que
            el mes en que se cobró conserve su cifra. La deuda vuelve a subir {q(pago.monto)}.
          </span>
        </div>

        <div className="form-field col-2">
          <label>Motivo<span className="req"> *</span></label>
          <textarea className="form-textarea" value={motivo}
            placeholder="Ej.: cheque rechazado, devolución al cliente, registrado por error…"
            onChange={(e) => { setMotivo(e.target.value); setError('') }} aria-invalid={!!error} />
          {error && <span className="form-error">{error}</span>}
        </div>
      </form>
    </Modal>
  )
}
