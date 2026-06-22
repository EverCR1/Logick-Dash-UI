import { useState, useEffect, type ReactNode, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { cuponesApi } from '@/lib/api'
import type { Cupon } from '@/types/cupon'

interface FormState {
  codigo: string; descripcion: string; tipo: string; valor: string
  minimo_compra: string; maximo_descuento: string; usos_maximos: string; usos_por_cuenta: string
  solo_primera_compra: boolean; es_publico: boolean
  fecha_inicio: string; fecha_vencimiento: string; estado: string; mensaje_error: string
}

const VACIO: FormState = {
  codigo: '', descripcion: '', tipo: 'porcentaje', valor: '', minimo_compra: '', maximo_descuento: '',
  usos_maximos: '', usos_por_cuenta: '1', solo_primera_compra: false, es_publico: true,
  fecha_inicio: '', fecha_vencimiento: '', estado: 'activo', mensaje_error: '',
}

export function CuponForm({ open, onClose, cupon }: {
  open: boolean; onClose: () => void; cupon: Cupon | null
}) {
  const queryClient = useQueryClient()
  const editar = !!cupon
  const [form, setForm] = useState<FormState>(VACIO)
  const [errores, setErrores] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    setForm(cupon ? {
      codigo: cupon.codigo, descripcion: cupon.descripcion ?? '', tipo: cupon.tipo, valor: String(cupon.valor ?? ''),
      minimo_compra: cupon.minimo_compra != null ? String(cupon.minimo_compra) : '',
      maximo_descuento: cupon.maximo_descuento != null ? String(cupon.maximo_descuento) : '',
      usos_maximos: cupon.usos_maximos != null ? String(cupon.usos_maximos) : '',
      usos_por_cuenta: String(cupon.usos_por_cuenta ?? 1),
      solo_primera_compra: cupon.solo_primera_compra, es_publico: cupon.es_publico,
      fecha_inicio: cupon.fecha_inicio?.slice(0, 10) ?? '', fecha_vencimiento: cupon.fecha_vencimiento?.slice(0, 10) ?? '',
      estado: cupon.estado, mensaje_error: cupon.mensaje_error ?? '',
    } : VACIO)
    setErrores({})
  }, [open, cupon])

  const set = (c: keyof FormState, v: string | boolean) => { setForm((f) => ({ ...f, [c]: v })); setErrores((e) => ({ ...e, [c]: '' })) }
  const num = (v: string) => (v === '' ? null : Number(v))

  const guardar = useMutation({
    mutationFn: () => {
      const payload = {
        codigo: form.codigo.trim().toUpperCase(), descripcion: form.descripcion.trim() || null,
        tipo: form.tipo as 'porcentaje' | 'monto_fijo', valor: Number(form.valor),
        minimo_compra: num(form.minimo_compra), maximo_descuento: num(form.maximo_descuento),
        usos_maximos: num(form.usos_maximos), usos_por_cuenta: Number(form.usos_por_cuenta || 1),
        solo_primera_compra: form.solo_primera_compra, es_publico: form.es_publico,
        fecha_inicio: form.fecha_inicio || null, fecha_vencimiento: form.fecha_vencimiento || null,
        estado: form.estado as 'activo' | 'inactivo', mensaje_error: form.mensaje_error.trim() || null,
      }
      return editar ? cuponesApi.actualizar(cupon!.id, payload) : cuponesApi.crear(payload)
    },
    onSuccess: () => { toast.success(editar ? 'Cupón actualizado' : 'Cupón creado'); queryClient.invalidateQueries({ queryKey: ['cupones'] }); onClose() },
    onError: (err) => {
      if (isAxiosError(err) && err.response?.status === 422) {
        const e: Record<string, string> = {}
        Object.entries(err.response.data?.errors ?? {}).forEach(([k, v]) => { e[k] = (v as string[])[0] })
        setErrores(e); toast.error('Revisa los campos marcados')
      } else toast.error('No se pudo guardar el cupón')
    },
  })

  const validar = () => {
    const e: Record<string, string> = {}
    if (!form.codigo.trim()) e.codigo = 'Requerido'
    if (form.valor === '') e.valor = 'Requerido'
    setErrores(e); return Object.keys(e).length === 0
  }
  const onSubmit = (ev: FormEvent) => { ev.preventDefault(); if (!validar()) return; guardar.mutate() }

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} title={editar ? 'Editar cupón' : 'Nuevo cupón'} size="lg"
      footer={<>
        <button type="button" className="btn" onClick={onClose} disabled={guardar.isPending}>Cancelar</button>
        <button type="submit" form="cupon-form" className="btn btn-primary" disabled={guardar.isPending}>
          {guardar.isPending && <Loader2 size={14} className="spin" />}{editar ? 'Guardar cambios' : 'Crear cupón'}
        </button>
      </>}>
      <form id="cupon-form" onSubmit={onSubmit} className="form-grid">
        <Campo label="Código" req error={errores.codigo}>
          <input className="form-input" value={form.codigo} onChange={(e) => set('codigo', e.target.value.toUpperCase())} aria-invalid={!!errores.codigo} placeholder="DESCUENTO10" />
        </Campo>
        <Campo label="Estado" error={errores.estado}>
          <Select value={form.estado} onValueChange={(v) => set('estado', v)} options={[{ value: 'activo', label: 'Activo' }, { value: 'inactivo', label: 'Inactivo' }]} />
        </Campo>
        <Campo label="Tipo" req error={errores.tipo}>
          <Select value={form.tipo} onValueChange={(v) => set('tipo', v)} options={[{ value: 'porcentaje', label: 'Porcentaje (%)' }, { value: 'monto_fijo', label: 'Monto fijo (Q)' }]} />
        </Campo>
        <Campo label={form.tipo === 'porcentaje' ? 'Valor (%)' : 'Valor (Q)'} req error={errores.valor}>
          <input type="number" step="0.01" min="0" className="form-input" value={form.valor} onChange={(e) => set('valor', e.target.value)} aria-invalid={!!errores.valor} />
        </Campo>
        <Campo label="Mínimo de compra" error={errores.minimo_compra}>
          <input type="number" step="0.01" min="0" className="form-input" value={form.minimo_compra} onChange={(e) => set('minimo_compra', e.target.value)} placeholder="Opcional" />
        </Campo>
        <Campo label="Máximo descuento" error={errores.maximo_descuento}>
          <input type="number" step="0.01" min="0" className="form-input" value={form.maximo_descuento} onChange={(e) => set('maximo_descuento', e.target.value)} placeholder="Opcional" />
        </Campo>
        <Campo label="Usos máximos (total)" error={errores.usos_maximos}>
          <input type="number" min="1" className="form-input" value={form.usos_maximos} onChange={(e) => set('usos_maximos', e.target.value)} placeholder="Ilimitado" />
        </Campo>
        <Campo label="Usos por cuenta" req error={errores.usos_por_cuenta}>
          <input type="number" min="1" className="form-input" value={form.usos_por_cuenta} onChange={(e) => set('usos_por_cuenta', e.target.value)} />
        </Campo>
        <Campo label="Fecha inicio" error={errores.fecha_inicio}>
          <input type="date" className="form-input" value={form.fecha_inicio} onChange={(e) => set('fecha_inicio', e.target.value)} />
        </Campo>
        <Campo label="Fecha vencimiento" error={errores.fecha_vencimiento}>
          <input type="date" className="form-input" value={form.fecha_vencimiento} onChange={(e) => set('fecha_vencimiento', e.target.value)} aria-invalid={!!errores.fecha_vencimiento} />
        </Campo>
        <Campo label="Descripción" error={errores.descripcion} col2>
          <input className="form-input" value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)} />
        </Campo>
        <div className="form-field col-2" style={{ flexDirection: 'row', gap: 22, flexWrap: 'wrap' }}>
          <label className="form-check">
            <input type="checkbox" checked={form.es_publico} onChange={(e) => set('es_publico', e.target.checked)} />
            Visible públicamente
          </label>
          <label className="form-check">
            <input type="checkbox" checked={form.solo_primera_compra} onChange={(e) => set('solo_primera_compra', e.target.checked)} />
            Solo primera compra
          </label>
        </div>
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
