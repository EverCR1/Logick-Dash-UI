import { useState, useEffect, useRef, type ReactNode, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { Loader2, Trash2, ImagePlus } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { ServicioImagen } from './ServicioImagen'
import { serviciosApi } from '@/lib/api'
import type { Servicio } from '@/types/servicio'

type FormState = Record<string, string>
const VACIO: FormState = { codigo: '', nombre: '', descripcion: '', inversion_estimada: '', precio_venta: '', precio_oferta: '', estado: 'activo', notas_internas: '' }

export function ServicioForm({ open, onClose, servicio }: {
  open: boolean; onClose: () => void; servicio: Servicio | null
}) {
  const queryClient = useQueryClient()
  const editar = !!servicio
  const [form, setForm] = useState<FormState>(VACIO)
  const [errores, setErrores] = useState<Record<string, string>>({})
  // Imagen seleccionada antes de crear el servicio (solo modo "nuevo")
  const [nuevaImg, setNuevaImg] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setForm(servicio ? {
      codigo: servicio.codigo, nombre: servicio.nombre, descripcion: servicio.descripcion ?? '',
      inversion_estimada: String(servicio.inversion_estimada ?? ''), precio_venta: String(servicio.precio_venta ?? ''),
      precio_oferta: servicio.precio_oferta ? String(servicio.precio_oferta) : '', estado: servicio.estado,
      notas_internas: servicio.notas_internas ?? '',
    } : VACIO)
    setErrores({})
    setNuevaImg(null)
  }, [open, servicio])

  useEffect(() => {
    if (!nuevaImg) { setPreview(null); return }
    const url = URL.createObjectURL(nuevaImg)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [nuevaImg])

  const elegirImagen = (f: File | null) => {
    if (f && !f.type.startsWith('image/')) { toast.error('El archivo debe ser una imagen'); return }
    if (f && f.size > 5 * 1024 * 1024) { toast.error('La imagen no puede superar 5 MB'); return }
    setNuevaImg(f)
  }
  const quitarImagen = () => { setNuevaImg(null); if (fileRef.current) fileRef.current.value = '' }

  const set = (c: string, v: string) => { setForm((f) => ({ ...f, [c]: v })); setErrores((e) => ({ ...e, [c]: '' })) }

  const guardar = useMutation({
    mutationFn: async () => {
      const payload = {
        codigo: form.codigo.trim(), nombre: form.nombre.trim(), descripcion: form.descripcion.trim() || null,
        inversion_estimada: Number(form.inversion_estimada), precio_venta: Number(form.precio_venta),
        precio_oferta: form.precio_oferta ? Number(form.precio_oferta) : null,
        estado: form.estado as 'activo' | 'inactivo', notas_internas: form.notas_internas.trim() || null,
      }
      if (editar) return serviciosApi.actualizar(servicio!.id, payload)
      // Crear: primero el servicio, luego subir la imagen seleccionada
      const creado = await serviciosApi.crear(payload)
      if (nuevaImg) await serviciosApi.subirImagen(creado.id, nuevaImg)
      return creado
    },
    onSuccess: () => { toast.success(editar ? 'Servicio actualizado' : 'Servicio creado'); queryClient.invalidateQueries({ queryKey: ['servicios'] }); onClose() },
    onError: (err) => {
      if (isAxiosError(err) && err.response?.status === 422) {
        const e: Record<string, string> = {}
        Object.entries(err.response.data?.errors ?? {}).forEach(([k, v]) => { e[k] = (v as string[])[0] })
        setErrores(e); toast.error('Revisa los campos marcados')
      } else toast.error('No se pudo guardar el servicio')
    },
  })

  const validar = () => {
    const e: Record<string, string> = {}
    if (!form.codigo.trim()) e.codigo = 'Requerido'
    if (!form.nombre.trim()) e.nombre = 'Requerido'
    if (form.inversion_estimada === '') e.inversion_estimada = 'Requerido'
    if (form.precio_venta === '') e.precio_venta = 'Requerido'
    setErrores(e); return Object.keys(e).length === 0
  }
  const onSubmit = (ev: FormEvent) => { ev.preventDefault(); if (!validar()) return; guardar.mutate() }

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} title={editar ? 'Editar servicio' : 'Nuevo servicio'}
      footer={<>
        <button type="button" className="btn" onClick={onClose} disabled={guardar.isPending}>Cancelar</button>
        <button type="submit" form="servicio-form" className="btn btn-primary" disabled={guardar.isPending}>
          {guardar.isPending && <Loader2 size={14} className="spin" />}{editar ? 'Guardar cambios' : 'Crear servicio'}
        </button>
      </>}>
      <form id="servicio-form" onSubmit={onSubmit} className="form-grid">
        <Campo label="Código" req error={errores.codigo}>
          <input className="form-input" value={form.codigo} onChange={(e) => set('codigo', e.target.value)} aria-invalid={!!errores.codigo} />
        </Campo>
        <Campo label="Estado" error={errores.estado}>
          <Select value={form.estado} onValueChange={(v) => set('estado', v)} options={[{ value: 'activo', label: 'Activo' }, { value: 'inactivo', label: 'Inactivo' }]} />
        </Campo>
        <Campo label="Nombre" req error={errores.nombre} col2>
          <input className="form-input" value={form.nombre} onChange={(e) => set('nombre', e.target.value)} aria-invalid={!!errores.nombre} />
        </Campo>
        <Campo label="Inversión estimada" req error={errores.inversion_estimada}>
          <input type="number" step="0.01" min="0" className="form-input" value={form.inversion_estimada} onChange={(e) => set('inversion_estimada', e.target.value)} aria-invalid={!!errores.inversion_estimada} />
        </Campo>
        <Campo label="Precio venta" req error={errores.precio_venta}>
          <input type="number" step="0.01" min="0" className="form-input" value={form.precio_venta} onChange={(e) => set('precio_venta', e.target.value)} aria-invalid={!!errores.precio_venta} />
        </Campo>
        <Campo label="Precio oferta" error={errores.precio_oferta} col2>
          <input type="number" step="0.01" min="0" className="form-input" value={form.precio_oferta} onChange={(e) => set('precio_oferta', e.target.value)} placeholder="Opcional" />
        </Campo>
        <Campo label="Descripción" error={errores.descripcion} col2>
          <textarea className="form-textarea" value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)} />
        </Campo>
        <Campo label="Notas internas" error={errores.notas_internas} col2>
          <textarea className="form-textarea" value={form.notas_internas} onChange={(e) => set('notas_internas', e.target.value)} />
        </Campo>

        <div className="form-section-title">Imagen</div>
        {editar && servicio ? (
          <ServicioImagen servicioId={servicio.id} imagenes={servicio.imagenes ?? []} />
        ) : (
          <div className="col-2" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => elegirImagen(e.target.files?.[0] ?? null)} />
            {preview ? (
              <div style={{ position: 'relative', width: 96, height: 96, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)', flexShrink: 0 }}>
                <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button type="button" className="icon-btn" title="Quitar" onClick={quitarImagen}
                  style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,.55)', color: '#fca5a5', width: 24, height: 24 }}>
                  <Trash2 size={13} />
                </button>
              </div>
            ) : (
              <div style={{ width: 96, height: 96, borderRadius: 8, border: '1px dashed var(--border)', display: 'grid', placeItems: 'center', color: 'var(--text-faint)', flexShrink: 0 }}>
                <ImagePlus size={22} />
              </div>
            )}
            <div style={{ display: 'grid', gap: 4 }}>
              <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
                <ImagePlus size={14} /> {preview ? 'Cambiar imagen' : 'Subir imagen'}
              </button>
              <span className="muted" style={{ fontSize: 11.5 }}>Opcional · JPG, PNG o WEBP · máx 5 MB.</span>
            </div>
          </div>
        )}
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
