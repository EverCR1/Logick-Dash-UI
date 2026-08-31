import { useState, useEffect, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { creditosApi } from '@/lib/api'
import { q } from '@/lib/format'
import type { Credito } from '@/types/credito'

export type ModoCierre = 'condonar' | 'anular'

const TEXTOS: Record<ModoCierre, {
  titulo: string
  boton: string
  exito: string
  explicacion: string
  placeholder: string
}> = {
  condonar: {
    titulo: 'Condonar crédito',
    boton: 'Condonar saldo',
    exito: 'Crédito condonado',
    explicacion:
      'La deuda era real y decides no cobrar lo que queda. El saldo se registra como una pérdida, separado de lo que sí se cobró.',
    placeholder: 'Ej.: acuerdo con el cliente, deuda incobrable…',
  },
  anular: {
    titulo: 'Anular crédito',
    boton: 'Anular crédito',
    exito: 'Crédito anulado',
    explicacion:
      'El crédito no debió existir: se registró por error o se deshizo la operación. No cuenta como pérdida, porque nunca fue una deuda real.',
    placeholder: 'Ej.: registrado por error, duplicado…',
  },
}

/**
 * Cierra un crédito por una de las dos vías que no son el pago.
 *
 * Exige motivo porque ambas son decisiones, no cálculos: meses después, sin él,
 * un saldo que dejó de cobrarse es indistinguible de un error. Sustituye al
 * botón de eliminar, que borraba también los abonos y con ellos el ingreso ya
 * reconocido de meses cerrados.
 */
export function CerrarCredito({ credito, modo, onClose }: {
  credito: Credito | null
  modo: ModoCierre
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState('')
  const t = TEXTOS[modo]

  useEffect(() => { if (credito) { setMotivo(''); setError('') } }, [credito, modo])

  const cerrar = useMutation({
    mutationFn: () => modo === 'condonar'
      ? creditosApi.condonar(credito!.id, motivo.trim())
      : creditosApi.anular(credito!.id, motivo.trim()),
    onSuccess: () => {
      toast.success(t.exito)
      // Cerrar un crédito lo saca de la cartera por cobrar, que se muestra
      // también en el dashboard y en los reportes por sucursal y por cliente.
      for (const key of [['creditos'], ['credito'], ['dashboard'], ['rep-resumen'], ['rep-clientes'], ['rep-sucursales']]) {
        queryClient.invalidateQueries({ queryKey: key })
      }
      onClose()
    },
    onError: (err) => {
      if (isAxiosError(err) && err.response?.status === 422) {
        setError(err.response.data?.errors?.motivo?.[0] ?? err.response.data?.message ?? 'Revisa el motivo')
      } else toast.error('No se pudo cerrar el crédito')
    },
  })

  const onSubmit = (ev: FormEvent) => {
    ev.preventDefault()
    if (motivo.trim().length < 3) { setError('Explica por qué se cierra este crédito'); return }
    cerrar.mutate()
  }

  if (!credito) return null

  const saldo = Number(credito.capital_restante)

  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title={t.titulo}
      footer={<>
        <button type="button" className="btn" onClick={onClose} disabled={cerrar.isPending}>Cancelar</button>
        <button type="submit" form="cerrar-credito" className="btn btn-primary" disabled={cerrar.isPending}>
          {cerrar.isPending && <Loader2 size={14} className="spin" />}{t.boton}
        </button>
      </>}>
      <form id="cerrar-credito" onSubmit={onSubmit} className="form-grid">
        <div className="form-field col-2">
          <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.55, margin: 0 }}>{t.explicacion}</p>
        </div>

        <div className="form-field col-2">
          <div className="rc-line">
            <span className="lbl">{credito.nombre_cliente}</span>
            <span className="val tnum">
              {modo === 'condonar' ? `Se perdonan ${q(saldo)}` : `Saldo al anular ${q(saldo)}`}
            </span>
          </div>
          {credito.pagos.length > 0 && (
            <span className="form-hint">
              Sus {credito.pagos.length} abono{credito.pagos.length === 1 ? '' : 's'} se conservan: ese dinero entró de verdad.
            </span>
          )}
        </div>

        <div className="form-field col-2">
          <label>Motivo<span className="req"> *</span></label>
          <textarea className="form-textarea" value={motivo} placeholder={t.placeholder}
            onChange={(e) => { setMotivo(e.target.value); setError('') }} aria-invalid={!!error} />
          {error && <span className="form-error">{error}</span>}
        </div>
      </form>
    </Modal>
  )
}
