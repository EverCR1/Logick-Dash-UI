import { useState, useEffect, useRef, type ReactNode, type FormEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { Loader2, ImagePlus, Trash2, Tag } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { categoriasApi, catalogosApi } from '@/lib/api'
import type { Categoria } from '@/types/categoria'

type FormState = Record<string, string>
const SIN_PADRE = 'none'
const VACIO: FormState = { nombre: '', descripcion: '', parent_id: SIN_PADRE, estado: 'activo' }

export function CategoriaForm({ open, onClose, categoria, parentInicial }: {
  open: boolean; onClose: () => void; categoria: Categoria | null; parentInicial?: number | null
}) {
  const queryClient = useQueryClient()
  const editar = !!categoria
  const [form, setForm] = useState<FormState>(VACIO)
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [quitarImagen, setQuitarImagen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const { data: opcionesCat = [] } = useQuery({
    queryKey: ['categorias-opciones'], queryFn: catalogosApi.categorias, staleTime: 1000 * 60 * 10, enabled: open,
  })

  useEffect(() => {
    if (!open) return
    setForm(categoria ? {
      nombre: categoria.nombre, descripcion: categoria.descripcion ?? '',
      parent_id: categoria.parent_id ? String(categoria.parent_id) : SIN_PADRE, estado: categoria.estado,
    } : { ...VACIO, parent_id: parentInicial ? String(parentInicial) : SIN_PADRE })
    setErrores({})
    setFile(null)
    setPreview(null)
    setQuitarImagen(false)
  }, [open, categoria, parentInicial])

  // Vista previa local del archivo seleccionado
  useEffect(() => {
    if (!file) { setPreview(null); return }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const set = (c: string, v: string) => { setForm((f) => ({ ...f, [c]: v })); setErrores((e) => ({ ...e, [c]: '' })) }

  const elegirArchivo = (f: File | null) => {
    if (f && !f.type.startsWith('image/')) { toast.error('El archivo debe ser una imagen'); return }
    if (f && f.size > 5 * 1024 * 1024) { toast.error('La imagen no puede superar 5 MB'); return }
    setFile(f)
    setQuitarImagen(false)
  }

  const quitar = () => { setFile(null); setQuitarImagen(true); if (fileRef.current) fileRef.current.value = '' }

  // Imagen actual a mostrar: preview del archivo nuevo > imagen guardada (si no se quitó)
  const imagenActual = categoria?.imagen?.url_thumb ?? categoria?.imagen?.url_medium ?? categoria?.imagen?.url
  const muestra = preview ?? (!quitarImagen ? imagenActual : null)

  const guardar = useMutation({
    mutationFn: async () => {
      const payload = {
        nombre: form.nombre.trim(), descripcion: form.descripcion.trim() || null,
        parent_id: form.parent_id !== SIN_PADRE ? Number(form.parent_id) : null,
        estado: form.estado as 'activo' | 'inactivo',
      }
      const cat = editar ? await categoriasApi.actualizar(categoria!.id, payload) : await categoriasApi.crear(payload)
      // Imagen: subir la nueva, o eliminar la existente si se quitó (solo al editar)
      if (file) await categoriasApi.subirImagen(cat.id, file)
      else if (editar && quitarImagen && categoria?.imagen) await categoriasApi.eliminarImagen(cat.id)
      return cat
    },
    onSuccess: () => {
      toast.success(editar ? 'Categoría actualizada' : 'Categoría creada')
      queryClient.invalidateQueries({ queryKey: ['categorias'] })
      queryClient.invalidateQueries({ queryKey: ['categorias-arbol'] })
      queryClient.invalidateQueries({ queryKey: ['categorias-opciones'] })
      onClose()
    },
    onError: (err) => {
      if (isAxiosError(err) && err.response?.status === 422) {
        const e: Record<string, string> = {}
        Object.entries(err.response.data?.errors ?? {}).forEach(([k, v]) => { e[k] = (v as string[])[0] })
        setErrores(e); toast.error('Revisa los campos marcados')
      } else toast.error('No se pudo guardar la categoría')
    },
  })

  const onSubmit = (ev: FormEvent) => { ev.preventDefault(); if (!form.nombre.trim()) { setErrores({ nombre: 'El nombre es obligatorio' }); return } guardar.mutate() }

  // No permitir que una categoría sea su propio padre
  const opcionesPadre = [
    { value: SIN_PADRE, label: 'Sin categoría padre (nivel 0)' },
    ...opcionesCat.filter((c) => c.id !== categoria?.id).map((c) => ({ value: String(c.id), label: c.nombre })),
  ]

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} title={editar ? 'Editar categoría' : 'Nueva categoría'}
      footer={<>
        <button type="button" className="btn" onClick={onClose} disabled={guardar.isPending}>Cancelar</button>
        <button type="submit" form="categoria-form" className="btn btn-primary" disabled={guardar.isPending}>
          {guardar.isPending && <Loader2 size={14} className="spin" />}{editar ? 'Guardar cambios' : 'Crear categoría'}
        </button>
      </>}>
      <form id="categoria-form" onSubmit={onSubmit} className="form-grid">
        <Campo label="Nombre" req error={errores.nombre} col2>
          <input className="form-input" value={form.nombre} onChange={(e) => set('nombre', e.target.value)} aria-invalid={!!errores.nombre} />
        </Campo>
        <Campo label="Categoría padre" error={errores.parent_id}>
          <Select value={form.parent_id} onValueChange={(v) => set('parent_id', v)} options={opcionesPadre} />
        </Campo>
        <Campo label="Estado" error={errores.estado}>
          <Select value={form.estado} onValueChange={(v) => set('estado', v)}
            options={[{ value: 'activo', label: 'Activo' }, { value: 'inactivo', label: 'Inactivo' }]} />
        </Campo>
        <Campo label="Descripción" error={errores.descripcion} col2>
          <textarea className="form-textarea" value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)} />
        </Campo>
        <Campo label="Imagen" error={errores.imagen} col2>
          <div className="cat-img-picker">
            <div className="cat-img-prev">
              {muestra ? <img src={muestra} alt="" /> : <Tag size={22} />}
            </div>
            <div className="cat-img-actions">
              <input ref={fileRef} type="file" accept="image/*" hidden
                onChange={(e) => elegirArchivo(e.target.files?.[0] ?? null)} />
              <button type="button" className="btn btn-sm" onClick={() => fileRef.current?.click()}>
                <ImagePlus size={14} />{muestra ? 'Cambiar imagen' : 'Seleccionar imagen'}
              </button>
              {muestra && (
                <button type="button" className="btn btn-sm" onClick={quitar}>
                  <Trash2 size={14} /> Quitar
                </button>
              )}
              <span className="muted" style={{ fontSize: 11.5 }}>JPG, PNG, WebP · máx. 5 MB</span>
            </div>
          </div>
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
