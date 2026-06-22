import { useState, useEffect, type ReactNode, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { proveedoresApi } from '@/lib/api'
import type { Proveedor } from '@/types/proveedor'

type FormState = Record<string, string>
const VACIO: FormState = { nombre: '', email: '', telefono: '', direccion: '', descripcion: '', estado: 'activo' }

export function ProveedorForm({ open, onClose, proveedor }: {
  open: boolean; onClose: () => void; proveedor: Proveedor | null
}) {
  const queryClient = useQueryClient()
  const editar = !!proveedor
  const [form, setForm] = useState<FormState>(VACIO)
  const [errores, setErrores] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    setForm(proveedor ? {
      nombre: proveedor.nombre, email: proveedor.email ?? '', telefono: proveedor.telefono ?? '',
      direccion: proveedor.direccion ?? '', descripcion: proveedor.descripcion ?? '', estado: proveedor.estado,
    } : VACIO)
    setErrores({})
  }, [open, proveedor])

  const set = (c: string, v: string) => { setForm((f) => ({ ...f, [c]: v })); setErrores((e) => ({ ...e, [c]: '' })) }

  const guardar = useMutation({
    mutationFn: () => {
      const payload = {
        nombre: form.nombre.trim(), email: form.email.trim() || null, telefono: form.telefono.trim() || null,
        direccion: form.direccion.trim() || null, descripcion: form.descripcion.trim() || null,
        estado: form.estado as 'activo' | 'inactivo',
      }
      return editar ? proveedoresApi.actualizar(proveedor!.id, payload) : proveedoresApi.crear(payload)
    },
    onSuccess: () => {
      toast.success(editar ? 'Proveedor actualizado' : 'Proveedor creado')
      queryClient.invalidateQueries({ queryKey: ['proveedores'] })
      onClose()
    },
    onError: (err) => {
      if (isAxiosError(err) && err.response?.status === 422) {
        const e: Record<string, string> = {}
        Object.entries(err.response.data?.errors ?? {}).forEach(([k, v]) => { e[k] = (v as string[])[0] })
        setErrores(e); toast.error('Revisa los campos marcados')
      } else toast.error('No se pudo guardar el proveedor')
    },
  })

  const onSubmit = (ev: FormEvent) => {
    ev.preventDefault()
    if (!form.nombre.trim()) { setErrores({ nombre: 'El nombre es obligatorio' }); return }
    guardar.mutate()
  }

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} title={editar ? 'Editar proveedor' : 'Nuevo proveedor'}
      footer={<>
        <button type="button" className="btn" onClick={onClose} disabled={guardar.isPending}>Cancelar</button>
        <button type="submit" form="proveedor-form" className="btn btn-primary" disabled={guardar.isPending}>
          {guardar.isPending && <Loader2 size={14} className="spin" />}{editar ? 'Guardar cambios' : 'Crear proveedor'}
        </button>
      </>}>
      <form id="proveedor-form" onSubmit={onSubmit} className="form-grid">
        <Campo label="Nombre" req error={errores.nombre} col2>
          <input className="form-input" value={form.nombre} onChange={(e) => set('nombre', e.target.value)} aria-invalid={!!errores.nombre} />
        </Campo>
        <Campo label="Teléfono" error={errores.telefono}>
          <input className="form-input" value={form.telefono} onChange={(e) => set('telefono', e.target.value)} />
        </Campo>
        <Campo label="Estado" error={errores.estado}>
          <Select value={form.estado} onValueChange={(v) => set('estado', v)}
            options={[{ value: 'activo', label: 'Activo' }, { value: 'inactivo', label: 'Inactivo' }]} />
        </Campo>
        <Campo label="Correo" error={errores.email} col2>
          <input type="email" className="form-input" value={form.email} onChange={(e) => set('email', e.target.value)} aria-invalid={!!errores.email} />
        </Campo>
        <Campo label="Dirección" error={errores.direccion} col2>
          <input className="form-input" value={form.direccion} onChange={(e) => set('direccion', e.target.value)} />
        </Campo>
        <Campo label="Descripción" error={errores.descripcion} col2>
          <textarea className="form-textarea" value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)} />
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
