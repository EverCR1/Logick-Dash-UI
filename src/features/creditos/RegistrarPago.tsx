import { useState, useEffect, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { creditosApi } from '@/lib/api'
import { q, fmtFecha } from '@/lib/format'
import type { Credito, PagoTipo } from '@/types/credito'

const hoy = () => new Date().toISOString().slice(0, 10)

export function RegistrarPago({ open, onClose, credito }: { open: boolean; onClose: () => void; credito: Credito | null }) {
  const queryClient = useQueryClient()
  const [monto, setMonto] = useState('')
  const [tipo, setTipo] = useState<PagoTipo>('abono')
  const [fecha, setFecha] = useState(hoy())
  const [observaciones, setObservaciones] = useState('')
  const [error, setError] = useState('')

  const restante = Number(credito?.capital_restante ?? 0)

  useEffect(() => {
    if (open) { setMonto(''); setTipo('abono'); setFecha(hoy()); setObservaciones(''); setError('') }
  }, [open, credito])

  const guardar = useMutation({
    mutationFn: () => creditosApi.registrarPago(credito!.id, {
      monto: tipo === 'pago_total' ? restante : Number(monto),
      tipo,
      observaciones: observaciones.trim() || null,
      fecha_pago: fecha || null,
    }),
    onSuccess: () => {
      toast.success('Pago registrado')
      queryClient.invalidateQueries({ queryKey: ['creditos'] })
      onClose()
    },
    onError: (err) => {
      if (isAxiosError(err) && err.response?.status === 422) {
        setError(err.response.data?.message ?? 'El monto no es válido')
      } else toast.error('No se pudo registrar el pago')
    },
  })

  const onSubmit = (ev: FormEvent) => {
    ev.preventDefault()
    if (tipo === 'abono') {
      const m = Number(monto)
      if (!m || m <= 0) { setError('Ingresa un monto válido'); return }
      if (m > restante) { setError(`El monto no puede superar el restante (${q(restante)})`); return }
    }
    guardar.mutate()
  }

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} title="Registrar pago" size="lg"
      footer={<>
        <button type="button" className="btn" onClick={onClose} disabled={guardar.isPending}>Cancelar</button>
        <button type="submit" form="pago-form" className="btn btn-primary" disabled={guardar.isPending}>
          {guardar.isPending && <Loader2 size={14} className="spin" />}Registrar pago
        </button>
      </>}>
      {credito && (
        <>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', padding: '4px 0 14px', borderBottom: '1px solid var(--border)', marginBottom: 14 }}>
            <Resumen label="Cliente" valor={credito.nombre_cliente} />
            <Resumen label="Capital" valor={q(credito.capital)} />
            <Resumen label="Restante" valor={q(restante)} destacado />
          </div>

          <form id="pago-form" onSubmit={onSubmit} className="form-grid">
            <div className="form-field">
              <label>Tipo de pago</label>
              <Select value={tipo} onValueChange={(v) => { setTipo(v as PagoTipo); setError('') }}
                options={[{ value: 'abono', label: 'Abono parcial' }, { value: 'pago_total', label: 'Pago total' }]} />
            </div>
            <div className="form-field">
              <label>Monto {tipo === 'abono' && <span className="req">*</span>}</label>
              <input className="form-input" type="number" min="0.01" step="0.01"
                value={tipo === 'pago_total' ? restante : monto}
                disabled={tipo === 'pago_total'}
                onChange={(e) => { setMonto(e.target.value); setError('') }} aria-invalid={!!error} />
            </div>
            <div className="form-field">
              <label>Fecha del pago</label>
              <input className="form-input" type="date" value={fecha} max={hoy()} onChange={(e) => setFecha(e.target.value)} />
            </div>
            <div className="form-field col-2">
              <label>Observaciones</label>
              <textarea className="form-textarea" rows={2} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Opcional" />
            </div>
            {error && <div className="form-field col-2"><span className="form-error">{error}</span></div>}
          </form>

          {credito.pagos.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontWeight: 600, fontSize: 12.5, marginBottom: 8 }}>Historial de pagos</div>
              <table className="tbl">
                <thead><tr><th>Fecha</th><th>Tipo</th><th className="num">Monto</th><th>Observaciones</th></tr></thead>
                <tbody>
                  {credito.pagos.map((p) => (
                    <tr key={p.id}>
                      <td className="muted" style={{ fontSize: 12 }}>{fmtFecha(p.fecha_pago)}</td>
                      <td><span className="badge"><span className="b-dot" />{p.tipo === 'pago_total' ? 'Pago total' : 'Abono'}</span></td>
                      <td className="num tnum" style={{ fontWeight: 600 }}>{q(p.monto)}</td>
                      <td className="muted" style={{ fontSize: 12 }}>{p.observaciones || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Modal>
  )
}

function Resumen({ label, valor, destacado }: { label: string; valor: string; destacado?: boolean }) {
  return (
    <div>
      <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: destacado ? 18 : 14, fontWeight: 600, marginTop: 2, color: destacado ? 'var(--accent)' : undefined }}>{valor}</div>
    </div>
  )
}
