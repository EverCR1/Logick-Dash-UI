import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Wallet, HandCoins, Undo2, SlidersHorizontal, Pencil, ChevronDown, ChevronUp } from 'lucide-react'
import { saldosApi } from '@/lib/api'
import { q, fmtFecha } from '@/lib/format'
import { MovimientoSaldo, type ModoSaldo } from './MovimientoSaldo'
import { EditarMovimiento } from './EditarMovimiento'
// Alias: `MovimientoSaldo` ya es el nombre del componente del modal
import type { MovimientoSaldo as Movimiento, TipoMovimientoSaldo } from '@/types/saldo'

/** Cuántos movimientos se ven antes de expandir. */
const VISIBLES = 8

const ETIQUETA: Record<TipoMovimientoSaldo, string> = {
  anticipo: 'Anticipo',
  devolucion: 'Devolución a cuenta',
  aplicado_venta: 'Aplicado a venta',
  reembolsado: 'Retirado en efectivo',
  ajuste: 'Ajuste manual',
}

/**
 * Saldo a favor del cliente y su libro de movimientos.
 *
 * Se muestra en la ficha del cliente porque es dinero suyo que está en tu caja:
 * pertenece a su historial tanto como sus compras.
 */
export function SaldoCliente({ cliente }: { cliente: { id: number; nombre: string } }) {
  const [modo, setModo] = useState<ModoSaldo | null>(null)
  const [editar, setEditar] = useState<Movimiento | null>(null)
  const [verTodos, setVerTodos] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['saldo-cliente', cliente.id],
    queryFn: () => saldosApi.porCliente(cliente.id),
  })

  const saldo = Number(data?.saldo ?? 0)
  // Del más reciente al más antiguo: la API los devuelve en orden cronológico
  const movimientos = [...(data?.movimientos ?? [])].reverse()

  return (
    <>
      <div className="card">
        <div className="card-header">
          <div className="card-title"><Wallet size={15} style={{ color: 'var(--accent)' }} />Saldo a favor</div>
        </div>

        {isLoading ? (
          <div className="empty" style={{ padding: 28 }}><Loader2 size={18} className="spin" /></div>
        ) : (
          <>
            <div style={{ padding: '4px 2px 12px' }}>
              <div className="tnum" style={{ fontSize: 26, fontWeight: 600, color: saldo > 0 ? 'var(--accent-text)' : 'var(--text-muted)' }}>
                {q(saldo)}
              </div>
              <div className="muted" style={{ fontSize: 11.5, lineHeight: 1.5 }}>
                {saldo > 0
                  ? 'Puede usarlo para pagar una venta o retirarlo en efectivo.'
                  : 'Sin saldo a favor. Un anticipo queda aquí hasta que lo use.'}
              </div>
            </div>

            <div className="action-list">
              <button className="action-btn" onClick={() => setModo('anticipo')}><HandCoins /> Registrar anticipo</button>
              {/* Ocupa el lugar de "editar el monto": un importe equivocado se
                  compensa con un ajuste y queda la corrección a la vista. */}
              <button className="action-btn" onClick={() => setModo('ajuste')}><SlidersHorizontal /> Ajustar saldo</button>
              {saldo > 0 && (
                <button className="action-btn" data-variant="danger" onClick={() => setModo('reembolsar')}>
                  <Undo2 /> Devolver en efectivo
                </button>
              )}
            </div>

            {movimientos.length > 0 && (
              <div className="timeline" style={{ marginTop: 14 }}>
                {(verTodos ? movimientos : movimientos.slice(0, VISIBLES)).map((m) => {
                  const entra = Number(m.monto) > 0
                  return (
                    <div className="tl-item" key={m.id}>
                      <span className="tl-dot" />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                          <span style={{ fontSize: 12.5 }}>{ETIQUETA[m.tipo]}</span>
                          <span className="tnum" style={{ fontSize: 12.5, fontWeight: 600, color: entra ? 'var(--pos)' : 'var(--text-muted)' }}>
                            {entra ? '+' : '−'}{q(Math.abs(Number(m.monto)))}
                          </span>
                        </div>
                        <div className="muted" style={{ fontSize: 11, lineHeight: 1.45 }}>
                          {fmtFecha(m.fecha)}
                          {m.venta && <> · <Link to={`/ventas?ver=${m.venta_id}`} className="link-venta">{m.venta.numero_venta}</Link></>}
                          {m.concepto && ` · ${m.concepto}`}
                          {' '}
                          <button type="button" className="icon-btn" title="Editar concepto y fecha"
                            style={{ verticalAlign: 'middle' }} onClick={() => setEditar(m)}>
                            <Pencil size={11} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
                {/* Expandible y no un corte seco: esta ficha es el único sitio
                    donde se consulta el historial completo de un cliente. */}
                {movimientos.length > VISIBLES && (
                  <button type="button" className="btn" style={{ marginTop: 4, alignSelf: 'flex-start' }}
                    onClick={() => setVerTodos((v) => !v)}>
                    {verTodos
                      ? <><ChevronUp size={14} /> Ver menos</>
                      : <><ChevronDown size={14} /> Ver los {movimientos.length} movimientos</>}
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <MovimientoSaldo cliente={modo ? cliente : null} modo={modo ?? 'anticipo'}
        saldoActual={saldo} onClose={() => setModo(null)} />
      <EditarMovimiento movimiento={editar} onClose={() => setEditar(null)} />
    </>
  )
}
