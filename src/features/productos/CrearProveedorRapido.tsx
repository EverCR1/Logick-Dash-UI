import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { proveedoresApi } from '@/lib/api'
import type { Proveedor } from '@/types/proveedor'

export function CrearProveedorRapido({ open, onClose, onCreated }: {
  open: boolean; onClose: () => void; onCreated: (p: Proveedor) => void
}) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ nombre: '', email: '', telefono: '' })
  const [error, setError] = useState('')

  useEffect(() => { if (open) { setForm({ nombre: '', email: '', telefono: '' }); setError('') } }, [open])

  const guardar = useMutation({
    mutationFn: () => proveedoresApi.crear({
      nombre: form.nombre.trim(),
      email: form.email.trim() || null,
      telefono: form.telefono.trim() || null,
      direccion: null,
      descripcion: null,
      estado: 'activo',
    }),
    onSuccess: (prov) => {
      toast.success('Proveedor creado')
      queryClient.invalidateQueries({ queryKey: ['proveedores-activos'] })
      onCreated(prov)
      onClose()
    },
    onError: (err) => {
      if (isAxiosError(err) && err.response?.status === 422) {
        const e = err.response.data?.errors as Record<string, string[]> | undefined
        setError(e?.nombre?.[0] ?? e?.email?.[0] ?? 'Revisa los datos')
      } else toast.error('No se pudo crear el proveedor')
    },
  })

  const submit = () => { if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return } guardar.mutate() }

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} title="Nuevo proveedor" description="Crea un proveedor sin salir del formulario"
      footer={<>
        <button type="button" className="btn" onClick={onClose} disabled={guardar.isPending}>Cancelar</button>
        <button type="button" className="btn btn-primary" onClick={submit} disabled={guardar.isPending}>
          {guardar.isPending && <Loader2 size={14} className="spin" />} Guardar
        </button>
      </>}>
      <div className="form-grid">
        <div className="form-field col-2">
          <label>Nombre <span className="req"> *</span></label>
          <input className="form-input" value={form.nombre} autoFocus
            onChange={(e) => { setForm((f) => ({ ...f, nombre: e.target.value })); setError('') }}
            placeholder="Nombre del proveedor" />
          {error && <span className="form-error">{error}</span>}
        </div>
        <div className="form-field">
          <label>Email</label>
          <input className="form-input" type="email" value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="correo@ejemplo.com" />
        </div>
        <div className="form-field">
          <label>Teléfono</label>
          <input className="form-input" value={form.telefono}
            onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))} placeholder="Número de teléfono" />
        </div>
      </div>
    </Modal>
  )
}
