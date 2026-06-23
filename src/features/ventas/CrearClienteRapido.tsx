import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { clientesApi } from '@/lib/api'
import type { ClienteBusqueda } from '@/types/venta'

export function CrearClienteRapido({ open, onClose, onCreated }: {
  open: boolean; onClose: () => void; onCreated: (c: ClienteBusqueda) => void
}) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ nombre: '', tipo: 'natural', nit: '', telefono: '', email: '' })
  const [error, setError] = useState('')

  useEffect(() => { if (open) { setForm({ nombre: '', tipo: 'natural', nit: '', telefono: '', email: '' }); setError('') } }, [open])

  const guardar = useMutation({
    mutationFn: () => clientesApi.crear({
      nombre: form.nombre.trim(),
      nit: form.nit.trim() || null,
      email: form.email.trim() || null,
      telefono: form.telefono.trim() || null,
      direccion: null,
      tipo: form.tipo as 'natural' | 'juridico',
      estado: 'activo',
      notas: null,
    }),
    onSuccess: (c) => {
      toast.success('Cliente creado')
      queryClient.invalidateQueries({ queryKey: ['clientes'] })
      onCreated({ id: c.id, nombre: c.nombre, nit: c.nit ?? null, email: c.email ?? null, telefono: c.telefono ?? null })
      onClose()
    },
    onError: (err) => {
      if (isAxiosError(err) && err.response?.status === 422) {
        const e = err.response.data?.errors as Record<string, string[]> | undefined
        setError(e?.nombre?.[0] ?? e?.nit?.[0] ?? e?.email?.[0] ?? 'Revisa los datos')
      } else toast.error('No se pudo crear el cliente')
    },
  })

  const submit = () => { if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return } guardar.mutate() }

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} title="Nuevo cliente" description="Crea un cliente sin salir de la venta"
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
            placeholder="Nombre del cliente" />
          {error && <span className="form-error">{error}</span>}
        </div>
        <div className="form-field">
          <label>Tipo</label>
          <Select value={form.tipo} onValueChange={(v) => setForm((f) => ({ ...f, tipo: v }))}
            options={[{ value: 'natural', label: 'Natural' }, { value: 'juridico', label: 'Jurídico' }]} />
        </div>
        <div className="form-field">
          <label>NIT</label>
          <input className="form-input" value={form.nit} onChange={(e) => setForm((f) => ({ ...f, nit: e.target.value }))} placeholder="C/F" />
        </div>
        <div className="form-field">
          <label>Teléfono</label>
          <input className="form-input" value={form.telefono} onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))} />
        </div>
        <div className="form-field">
          <label>Email</label>
          <input className="form-input" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="correo@ejemplo.com" />
        </div>
      </div>
    </Modal>
  )
}
