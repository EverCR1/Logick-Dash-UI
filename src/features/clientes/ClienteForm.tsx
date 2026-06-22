import { useState, useEffect, type ReactNode, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { clientesApi } from '@/lib/api'
import type { Cliente } from '@/types/cliente'

type FormState = Record<string, string>

const VACIO: FormState = {
  nombre: '', nit: '', email: '', telefono: '', direccion: '', tipo: 'natural', estado: 'activo', notas: '',
}

export function ClienteForm({ open, onClose, cliente }: {
  open: boolean; onClose: () => void; cliente: Cliente | null
}) {
  const queryClient = useQueryClient()
  const editar = !!cliente
  const [form, setForm] = useState<FormState>(VACIO)
  const [errores, setErrores] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    setForm(cliente ? {
      nombre: cliente.nombre, nit: cliente.nit ?? '', email: cliente.email ?? '',
      telefono: cliente.telefono ?? '', direccion: cliente.direccion ?? '',
      tipo: cliente.tipo, estado: cliente.estado, notas: cliente.notas ?? '',
    } : VACIO)
    setErrores({})
  }, [open, cliente])

  const set = (campo: string, valor: string) => {
    setForm((f) => ({ ...f, [campo]: valor }))
    setErrores((e) => ({ ...e, [campo]: '' }))
  }

  const guardar = useMutation({
    mutationFn: () => {
      const payload = {
        nombre: form.nombre.trim(),
        nit: form.nit.trim() || null,
        email: form.email.trim() || null,
        telefono: form.telefono.trim() || null,
        direccion: form.direccion.trim() || null,
        tipo: form.tipo as 'natural' | 'juridico',
        estado: form.estado as 'activo' | 'inactivo',
        notas: form.notas.trim() || null,
      }
      return editar ? clientesApi.actualizar(cliente!.id, payload) : clientesApi.crear(payload)
    },
    onSuccess: () => {
      toast.success(editar ? 'Cliente actualizado' : 'Cliente creado')
      queryClient.invalidateQueries({ queryKey: ['clientes'] })
      onClose()
    },
    onError: (err) => {
      if (isAxiosError(err) && err.response?.status === 422) {
        const apiErrors: Record<string, string[]> = err.response.data?.errors ?? {}
        const mapped: Record<string, string> = {}
        Object.entries(apiErrors).forEach(([k, v]) => { mapped[k] = v[0] })
        setErrores(mapped)
        toast.error('Revisa los campos marcados')
      } else {
        toast.error('No se pudo guardar el cliente')
      }
    },
  })

  const onSubmit = (ev: FormEvent) => {
    ev.preventDefault()
    if (!form.nombre.trim()) { setErrores({ nombre: 'El nombre es obligatorio' }); return }
    guardar.mutate()
  }

  return (
    <Modal
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={editar ? 'Editar cliente' : 'Nuevo cliente'}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose} disabled={guardar.isPending}>Cancelar</button>
          <button type="submit" form="cliente-form" className="btn btn-primary" disabled={guardar.isPending}>
            {guardar.isPending && <Loader2 size={14} className="spin" />}
            {editar ? 'Guardar cambios' : 'Crear cliente'}
          </button>
        </>
      }
    >
      <form id="cliente-form" onSubmit={onSubmit} className="form-grid">
        <Campo label="Nombre" req error={errores.nombre} col2>
          <input className="form-input" value={form.nombre} onChange={(e) => set('nombre', e.target.value)} aria-invalid={!!errores.nombre} placeholder="Nombre completo o razón social" />
        </Campo>
        <Campo label="Tipo" req error={errores.tipo}>
          <Select value={form.tipo} onValueChange={(v) => set('tipo', v)}
            options={[{ value: 'natural', label: 'Natural' }, { value: 'juridico', label: 'Jurídico' }]} />
        </Campo>
        <Campo label="Estado" error={errores.estado}>
          <Select value={form.estado} onValueChange={(v) => set('estado', v)}
            options={[{ value: 'activo', label: 'Activo' }, { value: 'inactivo', label: 'Inactivo' }]} />
        </Campo>
        <Campo label="NIT" error={errores.nit}>
          <input className="form-input" value={form.nit} onChange={(e) => set('nit', e.target.value)} aria-invalid={!!errores.nit} placeholder="C/F" />
        </Campo>
        <Campo label="Teléfono" error={errores.telefono}>
          <input className="form-input" value={form.telefono} onChange={(e) => set('telefono', e.target.value)} />
        </Campo>
        <Campo label="Correo" error={errores.email} col2>
          <input type="email" className="form-input" value={form.email} onChange={(e) => set('email', e.target.value)} aria-invalid={!!errores.email} />
        </Campo>
        <Campo label="Dirección" error={errores.direccion} col2>
          <input className="form-input" value={form.direccion} onChange={(e) => set('direccion', e.target.value)} />
        </Campo>
        <Campo label="Notas" error={errores.notas} col2>
          <textarea className="form-textarea" value={form.notas} onChange={(e) => set('notas', e.target.value)} />
        </Campo>
      </form>
    </Modal>
  )
}

function Campo({ label, req, error, children, col2 }: {
  label: string; req?: boolean; error?: string; children: ReactNode; col2?: boolean
}) {
  return (
    <div className={'form-field' + (col2 ? ' col-2' : '')}>
      <label>{label}{req && <span className="req"> *</span>}</label>
      {children}
      {error && <span className="form-error">{error}</span>}
    </div>
  )
}
