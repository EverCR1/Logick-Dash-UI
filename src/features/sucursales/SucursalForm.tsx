import { useState, useEffect, type ReactNode, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { sucursalesApi } from '@/lib/api'
import type { Sucursal } from '@/types/sucursal'

type FormState = Record<string, string>
const VACIO: FormState = { nombre: '', direccion: '', municipio: '', departamento: '', referencia: '', horario: '', telefono: '', estado: 'activo' }

export function SucursalForm({ open, onClose, sucursal }: {
  open: boolean; onClose: () => void; sucursal: Sucursal | null
}) {
  const queryClient = useQueryClient()
  const editar = !!sucursal
  const [form, setForm] = useState<FormState>(VACIO)
  const [errores, setErrores] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    setForm(sucursal ? {
      nombre: sucursal.nombre, direccion: sucursal.direccion ?? '', municipio: sucursal.municipio ?? '',
      departamento: sucursal.departamento ?? '', referencia: sucursal.referencia ?? '',
      horario: sucursal.horario ?? '', telefono: sucursal.telefono ?? '', estado: sucursal.estado,
    } : VACIO)
    setErrores({})
  }, [open, sucursal])

  const set = (c: string, v: string) => { setForm((f) => ({ ...f, [c]: v })); setErrores((e) => ({ ...e, [c]: '' })) }

  const guardar = useMutation({
    mutationFn: () => {
      const payload = {
        nombre: form.nombre.trim(), direccion: form.direccion.trim() || null, municipio: form.municipio.trim() || null,
        departamento: form.departamento.trim() || null, referencia: form.referencia.trim() || null,
        horario: form.horario.trim() || null, telefono: form.telefono.trim() || null, estado: form.estado as 'activo' | 'inactivo',
      }
      return editar ? sucursalesApi.actualizar(sucursal!.id, payload) : sucursalesApi.crear(payload)
    },
    onSuccess: () => { toast.success(editar ? 'Sucursal actualizada' : 'Sucursal creada'); queryClient.invalidateQueries({ queryKey: ['sucursales'] }); onClose() },
    onError: (err) => {
      if (isAxiosError(err) && err.response?.status === 422) {
        const e: Record<string, string> = {}
        Object.entries(err.response.data?.errors ?? {}).forEach(([k, v]) => { e[k] = (v as string[])[0] })
        setErrores(e); toast.error('Revisa los campos marcados')
      } else toast.error('No se pudo guardar la sucursal')
    },
  })

  const onSubmit = (ev: FormEvent) => { ev.preventDefault(); if (!form.nombre.trim()) { setErrores({ nombre: 'El nombre es obligatorio' }); return } guardar.mutate() }

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} title={editar ? 'Editar sucursal' : 'Nueva sucursal'}
      footer={<>
        <button type="button" className="btn" onClick={onClose} disabled={guardar.isPending}>Cancelar</button>
        <button type="submit" form="sucursal-form" className="btn btn-primary" disabled={guardar.isPending}>
          {guardar.isPending && <Loader2 size={14} className="spin" />}{editar ? 'Guardar cambios' : 'Crear sucursal'}
        </button>
      </>}>
      <form id="sucursal-form" onSubmit={onSubmit} className="form-grid">
        <Campo label="Nombre" req error={errores.nombre} col2>
          <input className="form-input" value={form.nombre} onChange={(e) => set('nombre', e.target.value)} aria-invalid={!!errores.nombre} />
        </Campo>
        <Campo label="Departamento" error={errores.departamento}>
          <input className="form-input" value={form.departamento} onChange={(e) => set('departamento', e.target.value)} />
        </Campo>
        <Campo label="Municipio" error={errores.municipio}>
          <input className="form-input" value={form.municipio} onChange={(e) => set('municipio', e.target.value)} />
        </Campo>
        <Campo label="Dirección" error={errores.direccion} col2>
          <input className="form-input" value={form.direccion} onChange={(e) => set('direccion', e.target.value)} />
        </Campo>
        <Campo label="Teléfono" error={errores.telefono}>
          <input className="form-input" value={form.telefono} onChange={(e) => set('telefono', e.target.value)} />
        </Campo>
        <Campo label="Estado" error={errores.estado}>
          <Select value={form.estado} onValueChange={(v) => set('estado', v)}
            options={[{ value: 'activo', label: 'Activo' }, { value: 'inactivo', label: 'Inactivo' }]} />
        </Campo>
        <Campo label="Horario" error={errores.horario} col2>
          <input className="form-input" value={form.horario} onChange={(e) => set('horario', e.target.value)} placeholder="Ej: Lun–Vie 8:00–18:00" />
        </Campo>
        <Campo label="Referencia" error={errores.referencia} col2>
          <input className="form-input" value={form.referencia} onChange={(e) => set('referencia', e.target.value)} />
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
