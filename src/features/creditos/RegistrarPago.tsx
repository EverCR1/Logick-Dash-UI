import { useState, useEffect, useMemo, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { Loader2, HandCoins, CheckCircle2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { creditosApi } from '@/lib/api'
import { q, fmtFecha } from '@/lib/format'
import type { Credito, PagoTipo } from '@/types/credito'

const hoy = () => new Date().toISOString().slice(0, 10)
const round2 = (n: number) => Math.round(n * 100) / 100

export function RegistrarPago({ open, onClose, credito }: { open: boolean; onClose: () => void; credito: Credito | null }) {
  const queryClient = useQueryClient()
  const [monto, setMonto] = useState('')
  const [tipo, setTipo] = useState<PagoTipo>('abono')
  const [fecha, setFecha] = useState(hoy())
  const [observaciones, setObservaciones] = useState('')
  const [error, setError] = useState('')

  const restante = Number(credito?.capital_restante ?? 0)
  const capital = Number(credito?.capital ?? 0) || restante
  const pct = useMemo(() => (capital > 0 ? Math.round(((capital - restante) / capital) * 100) : 0), [capital, restante])

  useEffect(() => {
    if (open) { setMonto(''); setTipo('abono'); setFecha(hoy()); setObservaciones(''); setError('') }
  }, [open, credito])

  const elegirTipo = (t: PagoTipo) => {
    setTipo(t); setError('')
    if (t === 'pago_total') setMonto(restante.toFixed(2))
  }

  const onMonto = (v: string) => {
    setMonto(v); setError('')
    const m = parseFloat(v) || 0
    if (Math.abs(m - restante) < 0.01 && restante > 0) setTipo('pago_total')
    else if (tipo === 'pago_total') setTipo('abono')
  }

  const aplicarRapido = (m: number) => {
    setMonto(m.toFixed(2)); setError('')
    setTipo(Math.abs(m - restante) < 0.01 ? 'pago_total' : 'abono')
  }

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
    const m = tipo === 'pago_total' ? restante : Number(monto)
    if (!m || m <= 0) { setError('Ingresa un monto mayor a Q0.00'); return }
    if (m > restante + 0.005) { setError(`El máximo permitido es ${q(restante)}`); return }
    guardar.mutate()
  }

  const rapidos = [25, 50, 75, 100].map((p) => ({ p, m: round2((restante * p) / 100) })).filter((r) => r.m > 0)

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} title="Registrar pago" size="lg"
      description={credito?.nombre_cliente}
      footer={<>
        <button type="button" className="btn" onClick={onClose} disabled={guardar.isPending}>Cancelar</button>
        <button type="submit" form="pago-form" className="btn btn-primary" disabled={guardar.isPending || restante <= 0}>
          {guardar.isPending && <Loader2 size={14} className="spin" />}Confirmar pago
        </button>
      </>}>
      {credito && (
        <>
          {/* Capital pendiente + progreso */}
          <div className="pago-restante" data-pagado={restante <= 0}>
            <span className="pago-restante-label">Capital pendiente</span>
            <div className="pago-restante-amount tnum">{q(restante)}</div>
            <div className="pago-progress"><div className="pago-progress-bar" style={{ width: `${pct}%` }} /></div>
            <div className="pago-progress-meta">
              <span>{pct}% pagado</span>
              <span>Total: {q(capital)}</span>
            </div>
          </div>

          <form id="pago-form" onSubmit={onSubmit} className="form-grid" style={{ marginTop: 16 }}>
            {/* Tipo de pago (pills) */}
            <div className="form-field col-2">
              <label>Tipo de pago</label>
              <div className="pago-pills">
                <button type="button" className="pago-pill" data-on={tipo === 'abono'} onClick={() => elegirTipo('abono')}>
                  <HandCoins size={15} /> Abono
                </button>
                <button type="button" className="pago-pill" data-on={tipo === 'pago_total'} onClick={() => elegirTipo('pago_total')}>
                  <CheckCircle2 size={15} /> Pago total
                </button>
              </div>
            </div>

            {/* Monto */}
            <div className="form-field col-2">
              <label>Monto del pago {tipo === 'abono' && <span className="req">*</span>}</label>
              <div className="input-prefix" aria-disabled={tipo === 'pago_total'}>
                <span className="ip-prefix">Q</span>
                <input type="number" min="0.01" step="0.01" placeholder="0.00"
                  value={tipo === 'pago_total' ? restante.toFixed(2) : monto}
                  readOnly={tipo === 'pago_total'}
                  onChange={(e) => onMonto(e.target.value)} aria-invalid={!!error} />
              </div>
              <span className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>Máximo: {q(restante)}</span>
            </div>

            {/* Montos rápidos */}
            {rapidos.length > 0 && (
              <div className="form-field col-2">
                <label>Montos rápidos</label>
                <div className="pago-rapidos">
                  {rapidos.map(({ p, m }) => (
                    <button type="button" key={p} className="pago-rapido" data-total={p === 100} onClick={() => aplicarRapido(m)}>
                      {p === 100 ? 'Total' : `${p}%`} — {q(m)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="form-field">
              <label>Fecha del pago</label>
              <input className="form-input" type="date" value={fecha} max={hoy()} onChange={(e) => setFecha(e.target.value)} />
            </div>
            <div className="form-field">
              <label>Observaciones</label>
              <input className="form-input" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Opcional" />
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
