import { useState, useEffect, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { Loader2, Search, X } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { saldosApi, ventasApi } from '@/lib/api'
import { useDebounce } from '@/lib/hooks'
import { q, fechaLocal } from '@/lib/format'
import type { ClienteBusqueda } from '@/types/venta'

export type ModoSaldo = 'anticipo' | 'reembolsar' | 'ajuste'

const TEXTOS: Record<ModoSaldo, {
  titulo: string; boton: string; explicacion: string; placeholder: string
}> = {
  ajuste: {
    titulo: 'Ajustar saldo',
    boton: 'Registrar ajuste',
    explicacion:
      'Corrección manual. Úsalo para arreglar un movimiento mal registrado, o para cargar un saldo que el cliente ya traía. Escribe el monto en negativo para restar.',
    placeholder: 'Ej.: corrección, se registró Q1,500 y eran Q150…',
  },
  anticipo: {
    titulo: 'Registrar anticipo',
    boton: 'Registrar anticipo',
    explicacion:
      'Dinero que el cliente deja adelantado. Entra a caja, pero todavía no cuenta como ingreso: se reconocerá cuando lo use en una venta, que es cuando se entrega lo que pagó.',
    placeholder: 'Ej.: adelanto para instalación de red…',
  },
  reembolsar: {
    titulo: 'Devolver saldo en efectivo',
    boton: 'Registrar reembolso',
    explicacion:
      'El cliente retira el dinero que tenía a favor. Sale de caja y su saldo baja; no se puede retirar más de lo que tiene.',
    placeholder: 'Ej.: ya no hará el trabajo…',
  },
}

/**
 * Registra un movimiento de saldo a favor: un anticipo o su retiro.
 *
 * Exige concepto porque meses después nadie recuerda de qué trabajo era el
 * adelanto, y el saldo a favor es dinero que se le debe al cliente.
 */
export function MovimientoSaldo({ open, cliente, modo, saldoActual, onClose }: {
  /** Abierto sin cliente fijo: el modal pide a quién, con su saldo actual. */
  open?: boolean
  cliente: { id: number; nombre: string; saldo_favor?: number | null } | null
  modo: ModoSaldo
  saldoActual: number
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [monto, setMonto] = useState('')
  const [concepto, setConcepto] = useState('')
  const [fecha, setFecha] = useState(fechaLocal())
  const [error, setError] = useState('')
  // Solo se usa cuando el modal se abre sin cliente, desde el listado
  const [elegido, setElegido] = useState<ClienteBusqueda | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const busquedaDeb = useDebounce(busqueda)
  const t = TEXTOS[modo]

  const abierto = open ?? cliente !== null
  const destinatario = cliente ?? elegido
  // Desde la ficha el saldo llega por prop; desde el listado viene con el
  // resultado de la búsqueda, que ya lo trae.
  const saldo = cliente ? saldoActual : Number(elegido?.saldo_favor ?? 0)

  const resultados = useQuery({
    queryKey: ['saldo-buscar-cliente', busquedaDeb],
    queryFn: () => ventasApi.buscarClientes(busquedaDeb),
    enabled: abierto && !cliente && !elegido && busquedaDeb.trim().length >= 1,
  })

  useEffect(() => {
    if (!abierto) return
    setMonto(''); setConcepto(''); setFecha(fechaLocal()); setError('')
    setElegido(null); setBusqueda('')
  }, [abierto, cliente?.id, modo])

  const guardar = useMutation({
    mutationFn: () => {
      const payload = { cliente_id: destinatario!.id, monto: Number(monto), fecha, concepto: concepto.trim() }
      if (modo === 'anticipo') return saldosApi.anticipo(payload)
      if (modo === 'ajuste') return saldosApi.ajustar(payload)
      return saldosApi.reembolsar(payload)
    },
    onSuccess: ({ saldo }) => {
      toast.success(`${TEXTOS[modo].titulo.replace('Registrar ', '')} · saldo ${q(saldo)}`)
      for (const key of [['saldos'], ['saldo-cliente'], ['clientes'], ['cliente']]) {
        queryClient.invalidateQueries({ queryKey: key })
      }
      onClose()
    },
    onError: (err) => {
      if (isAxiosError(err) && err.response?.status === 422) {
        setError(err.response.data?.errors?.concepto?.[0]
          ?? err.response.data?.errors?.monto?.[0]
          ?? err.response.data?.message ?? 'Revisa los datos')
      } else toast.error('No se pudo registrar el movimiento')
    },
  })

  const onSubmit = (ev: FormEvent) => {
    ev.preventDefault()
    if (!destinatario) { setError('Elige a qué cliente'); return }
    const m = Number(monto)
    // El ajuste admite negativos: es su razón de ser
    if (!m || (modo !== 'ajuste' && m <= 0)) { setError('Ingresa un monto válido'); return }
    if (modo === 'reembolsar' && m > saldo + 0.005) {
      setError(`El máximo que puede retirar es ${q(saldo)}`); return
    }
    if (modo === 'ajuste' && m < 0 && Math.abs(m) > saldo + 0.005) {
      setError(`No puedes restar más de ${q(saldo)}: el saldo no puede quedar negativo`); return
    }
    if (concepto.trim().length < 3) { setError('Anota de qué es este movimiento'); return }
    guardar.mutate()
  }

  if (!abierto) return null

  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title={t.titulo}
      footer={<>
        <button type="button" className="btn" onClick={onClose} disabled={guardar.isPending}>Cancelar</button>
        <button type="submit" form="mov-saldo" className="btn btn-primary"
          disabled={guardar.isPending || !destinatario}>
          {guardar.isPending && <Loader2 size={14} className="spin" />}{t.boton}
        </button>
      </>}>
      <form id="mov-saldo" onSubmit={onSubmit} className="form-grid">
        <div className="form-field col-2">
          <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.55, margin: 0 }}>{t.explicacion}</p>
        </div>

        {/* Desde la ficha el cliente ya viene fijado; desde el listado hay que
            elegirlo, y su saldo llega con el resultado de la búsqueda. */}
        {destinatario ? (
          <div className="form-field col-2">
            <div className="rc-line">
              <span className="lbl">{destinatario.nombre}</span>
              <span className="val tnum">Saldo actual {q(saldo)}</span>
            </div>
            {!cliente && (
              <button type="button" className="btn" style={{ marginTop: 6, alignSelf: 'flex-start' }}
                onClick={() => { setElegido(null); setBusqueda('') }}>
                <X size={13} /> Cambiar de cliente
              </button>
            )}
          </div>
        ) : (
          <div className="form-field col-2" style={{ position: 'relative' }}>
            <label>Cliente<span className="req"> *</span></label>
            <div className="toolbar-search">
              <Search size={15} />
              <input placeholder="Buscar por nombre, NIT o teléfono…" value={busqueda}
                onChange={(e) => { setBusqueda(e.target.value); setError('') }} />
              {resultados.isFetching && <Loader2 size={14} className="spin" style={{ color: 'var(--text-faint)' }} />}
            </div>
            {busquedaDeb.trim().length >= 1 && (
              <div className="venta-resultados">
                {(resultados.data?.length ?? 0) === 0 ? (
                  <div className="muted" style={{ padding: '8px 10px', fontSize: 12 }}>
                    {resultados.isFetching ? 'Buscando…' : 'Sin clientes que coincidan'}
                  </div>
                ) : resultados.data!.map((cl) => (
                  <button key={cl.id} type="button" className="venta-dropdown-item"
                    onClick={() => { setElegido(cl); setBusqueda(''); setError('') }}>
                    <span style={{ flex: 1 }}>{cl.nombre}</span>
                    <span className="muted" style={{ fontSize: 11.5 }}>
                      {Number(cl.saldo_favor ?? 0) > 0 ? `saldo ${q(Number(cl.saldo_favor))}` : cl.nit ?? ''}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="form-field">
          <label>Monto<span className="req"> *</span></label>
          <input className="form-input" type="number" step="0.01" value={monto}
            min={modo === 'ajuste' ? undefined : 0.01}
            max={modo === 'reembolsar' ? saldo : undefined}
            onChange={(e) => { setMonto(e.target.value); setError('') }} aria-invalid={!!error} />
          {modo === 'ajuste' && Number(monto) !== 0 && !isNaN(Number(monto)) && (
            <span className="form-hint">
              El saldo pasará de {q(saldo)} a {q(saldo + Number(monto))}.
            </span>
          )}
        </div>

        <div className="form-field">
          <label>Fecha</label>
          <input className="form-input" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>

        <div className="form-field col-2">
          <label>Concepto<span className="req"> *</span></label>
          <textarea className="form-textarea" value={concepto} placeholder={t.placeholder}
            onChange={(e) => { setConcepto(e.target.value); setError('') }} aria-invalid={!!error} />
          {error && <span className="form-error">{error}</span>}
        </div>
      </form>
    </Modal>
  )
}
