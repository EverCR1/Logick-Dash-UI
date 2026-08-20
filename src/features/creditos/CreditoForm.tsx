import { useState, useEffect, type ReactNode, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { Loader2, Search, X } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { creditosApi, ventasApi } from '@/lib/api'
import { useDebounce } from '@/lib/hooks'
import { fechaLocal, fmtFecha, q } from '@/lib/format'
import type { Credito } from '@/types/credito'
import type { Venta } from '@/types/venta'

type FormState = Record<string, string>
const hoy = () => fechaLocal()
const VACIO: FormState = { nombre_cliente: '', capital: '', producto_o_servicio_dado: '', fecha_credito: hoy(), capital_restante: '' }

export function CreditoForm({ open, onClose, credito }: { open: boolean; onClose: () => void; credito: Credito | null }) {
  const queryClient = useQueryClient()
  const editar = !!credito
  const [form, setForm] = useState<FormState>(VACIO)
  const [errores, setErrores] = useState<Record<string, string>>({})
  // Venta de origen: opcional, pero es lo que permite atribuir el crédito a su
  // sucursal y a su cliente en los reportes.
  const [venta, setVenta] = useState<Venta | null>(null)

  useEffect(() => {
    if (!open) return
    setVenta(null)
    setForm(credito ? {
      nombre_cliente: credito.nombre_cliente,
      capital: String(credito.capital),
      producto_o_servicio_dado: credito.producto_o_servicio_dado ?? '',
      fecha_credito: credito.fecha_credito?.slice(0, 10) ?? hoy(),
      capital_restante: String(credito.capital_restante),
    } : { ...VACIO })
    setErrores({})
  }, [open, credito])

  const set = (c: string, v: string) => { setForm((f) => ({ ...f, [c]: v })); setErrores((e) => ({ ...e, [c]: '' })) }

  const guardar = useMutation({
    mutationFn: () => {
      const base = {
        nombre_cliente: form.nombre_cliente.trim(),
        capital: Number(form.capital),
        producto_o_servicio_dado: form.producto_o_servicio_dado.trim() || null,
        fecha_credito: form.fecha_credito,
      }
      if (editar) return creditosApi.actualizar(credito!.id, base)
      // En creación, capital_restante por defecto = capital (crédito sin abonos)
      const restante = form.capital_restante !== '' ? Number(form.capital_restante) : Number(form.capital)
      return creditosApi.crear({ ...base, capital_restante: restante, venta_id: venta?.id ?? null })
    },
    onSuccess: () => {
      toast.success(editar ? 'Crédito actualizado' : 'Crédito creado')
      queryClient.invalidateQueries({ queryKey: ['creditos'] })
      onClose()
    },
    onError: (err) => {
      if (isAxiosError(err) && err.response?.status === 422) {
        const e: Record<string, string> = {}
        Object.entries(err.response.data?.errors ?? {}).forEach(([k, v]) => { e[k] = (v as string[])[0] })
        setErrores(e); toast.error('Revisa los campos marcados')
      } else toast.error('No se pudo guardar el crédito')
    },
  })

  const onSubmit = (ev: FormEvent) => {
    ev.preventDefault()
    const e: Record<string, string> = {}
    if (!form.nombre_cliente.trim()) e.nombre_cliente = 'El nombre es obligatorio'
    if (!form.capital || Number(form.capital) <= 0) e.capital = 'Ingresa un capital válido'
    if (Object.keys(e).length) { setErrores(e); return }
    guardar.mutate()
  }

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} title={editar ? 'Editar crédito' : 'Nuevo crédito'}
      footer={<>
        <button type="button" className="btn" onClick={onClose} disabled={guardar.isPending}>Cancelar</button>
        <button type="submit" form="credito-form" className="btn btn-primary" disabled={guardar.isPending}>
          {guardar.isPending && <Loader2 size={14} className="spin" />}{editar ? 'Guardar cambios' : 'Crear crédito'}
        </button>
      </>}>
      <form id="credito-form" onSubmit={onSubmit} className="form-grid">
        {/* Solo al crear: enlazar un crédito existente a una venta cambiaría su
            historia, y los antiguos se conservan tal como se registraron. */}
        {!editar && (
          <div className="form-field col-2">
            <label>Venta de origen</label>
            <SelectorVenta
              venta={venta}
              onSelect={(v) => {
                setVenta(v)
                // Prellenar ahorra retecleo y evita que el nombre no coincida
                if (v) {
                  setForm((f) => ({
                    ...f,
                    nombre_cliente: v.cliente?.nombre || f.nombre_cliente,
                    capital: String(v.total),
                    fecha_credito: v.created_at.slice(0, 10),
                  }))
                  setErrores({})
                }
              }}
            />
            <span className="form-hint">
              Opcional, pero recomendado: sin venta el crédito no se puede atribuir a una
              sucursal ni al historial del cliente en los reportes.
            </span>
          </div>
        )}
        <Campo label="Cliente" req error={errores.nombre_cliente} col2>
          <input className="form-input" value={form.nombre_cliente} onChange={(e) => set('nombre_cliente', e.target.value)} aria-invalid={!!errores.nombre_cliente} />
        </Campo>
        <Campo label="Capital" req error={errores.capital}>
          <input className="form-input" type="number" min="0.01" step="0.01" value={form.capital} onChange={(e) => set('capital', e.target.value)} aria-invalid={!!errores.capital} />
        </Campo>
        {editar ? (
          <Campo label="Fecha del crédito" req error={errores.fecha_credito}>
            <input className="form-input" type="date" value={form.fecha_credito} onChange={(e) => set('fecha_credito', e.target.value)} />
          </Campo>
        ) : (
          <Campo label="Capital restante" error={errores.capital_restante}>
            <input className="form-input" type="number" min="0" step="0.01" value={form.capital_restante}
              onChange={(e) => set('capital_restante', e.target.value)} placeholder={form.capital || 'Igual al capital'} />
          </Campo>
        )}
        {!editar && (
          <Campo label="Fecha del crédito" req error={errores.fecha_credito}>
            <input className="form-input" type="date" value={form.fecha_credito} onChange={(e) => set('fecha_credito', e.target.value)} />
          </Campo>
        )}
        <Campo label="Producto o servicio dado" error={errores.producto_o_servicio_dado} col2>
          <textarea className="form-textarea" value={form.producto_o_servicio_dado} onChange={(e) => set('producto_o_servicio_dado', e.target.value)} />
        </Campo>
      </form>
    </Modal>
  )
}

/**
 * Busca una venta para ligarla al crédito. Reutiliza el índice de ventas, que ya
 * busca por número, cliente y productos con el algoritmo por palabras.
 */
function SelectorVenta({ venta, onSelect }: { venta: Venta | null; onSelect: (v: Venta | null) => void }) {
  const [texto, setTexto] = useState('')
  const reposado = useDebounce(texto)

  const { data, isFetching } = useQuery({
    queryKey: ['creditos-buscar-venta', reposado],
    queryFn: () => ventasApi.listar({ search: reposado, per_page: 8, sort: 'fecha_desc' }),
    enabled: reposado.trim().length >= 2 && !venta,
  })

  if (venta) {
    return (
      <div className="venta-elegida">
        <div style={{ minWidth: 0 }}>
          <strong>{venta.numero_venta}</strong>
          <div className="muted" style={{ fontSize: 11.5 }}>
            {venta.cliente?.nombre ?? 'Consumidor final'} · {fmtFecha(venta.created_at)} · {q(Number(venta.total))}
          </div>
        </div>
        <button type="button" className="icon-btn" title="Quitar la venta" onClick={() => onSelect(null)}>
          <X size={14} />
        </button>
      </div>
    )
  }

  const ventas = data?.ventas.data ?? []

  return (
    <div style={{ position: 'relative' }}>
      <div className="toolbar-search">
        <Search size={15} />
        <input placeholder="Buscar por N° de venta, cliente o producto…"
          value={texto} onChange={(e) => setTexto(e.target.value)} />
        {isFetching && <Loader2 size={14} className="spin" style={{ color: 'var(--text-faint)' }} />}
        {texto && (
          <button type="button" className="ts-clear" onClick={() => setTexto('')} aria-label="Limpiar">
            <X size={14} />
          </button>
        )}
      </div>

      {reposado.trim().length >= 2 && (
        <div className="venta-resultados">
          {ventas.length === 0 ? (
            <div className="muted" style={{ padding: '8px 10px', fontSize: 12 }}>
              {isFetching ? 'Buscando…' : 'Sin ventas que coincidan'}
            </div>
          ) : ventas.map((v) => (
            <button key={v.id} type="button" className="venta-dropdown-item" onClick={() => { onSelect(v); setTexto('') }}>
              <span style={{ fontWeight: 500 }}>{v.numero_venta}</span>
              <span className="muted" style={{ fontSize: 11.5 }}>
                {v.cliente?.nombre ?? 'Consumidor final'} · {fmtFecha(v.created_at)} · {q(Number(v.total))}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Campo({ label, req, error, children, col2 }: { label: string; req?: boolean; error?: string; children: ReactNode; col2?: boolean }) {
  return (
    <div className={'form-field' + (col2 ? ' col-2' : '')}>
      <label>{label}{req && <span className="req"> *</span>}</label>
      {children}
      {error && <span className="form-error">{error}</span>}
    </div>
  )
}
