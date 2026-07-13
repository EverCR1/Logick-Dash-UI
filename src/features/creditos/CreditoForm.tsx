import { useState, useEffect, type ReactNode, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { creditosApi } from '@/lib/api'
import { fechaLocal } from '@/lib/format'
import type { Credito } from '@/types/credito'

type FormState = Record<string, string>
const hoy = () => fechaLocal()
const VACIO: FormState = { nombre_cliente: '', capital: '', producto_o_servicio_dado: '', fecha_credito: hoy(), capital_restante: '' }

export function CreditoForm({ open, onClose, credito }: { open: boolean; onClose: () => void; credito: Credito | null }) {
  const queryClient = useQueryClient()
  const editar = !!credito
  const [form, setForm] = useState<FormState>(VACIO)
  const [errores, setErrores] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
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
      return creditosApi.crear({ ...base, capital_restante: restante })
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

function Campo({ label, req, error, children, col2 }: { label: string; req?: boolean; error?: string; children: ReactNode; col2?: boolean }) {
  return (
    <div className={'form-field' + (col2 ? ' col-2' : '')}>
      <label>{label}{req && <span className="req"> *</span>}</label>
      {children}
      {error && <span className="form-error">{error}</span>}
    </div>
  )
}
