import { useState, useEffect, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, Trash2, ImagePlus } from 'lucide-react'
import { serviciosApi } from '@/lib/api'
import type { ServicioImagen as TImagen } from '@/types/servicio'

export function ServicioImagen({ servicioId, imagenes }: { servicioId: number; imagenes: TImagen[] }) {
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [img, setImg] = useState<TImagen | null>(imagenes[0] ?? null)

  useEffect(() => { setImg(imagenes[0] ?? null) }, [imagenes, servicioId])

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ['servicios'] })

  const subir = useMutation({
    mutationFn: (file: File) => serviciosApi.subirImagen(servicioId, file),
    onSuccess: (nueva) => { setImg(nueva); toast.success('Imagen actualizada'); invalidar() },
    onError: () => toast.error('No se pudo subir la imagen'),
  })

  const eliminar = useMutation({
    mutationFn: (imagenId: number) => serviciosApi.eliminarImagen(servicioId, imagenId),
    onSuccess: () => { setImg(null); toast.success('Imagen eliminada'); invalidar() },
    onError: () => toast.error('No se pudo eliminar la imagen'),
  })

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) subir.mutate(file)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="col-2" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={onPick} />
      {img ? (
        <div style={{ position: 'relative', width: 96, height: 96, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)', flexShrink: 0 }}>
          <img src={img.url_thumb ?? img.url_medium ?? img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <button type="button" className="icon-btn" disabled={eliminar.isPending} title="Eliminar"
            onClick={() => eliminar.mutate(img.id)}
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
        <button type="button" className="btn" onClick={() => inputRef.current?.click()} disabled={subir.isPending}>
          {subir.isPending ? <Loader2 size={14} className="spin" /> : <ImagePlus size={14} />} {img ? 'Reemplazar imagen' : 'Subir imagen'}
        </button>
        <span className="muted" style={{ fontSize: 11.5 }}>JPG, PNG o WEBP · máx 5 MB.</span>
      </div>
    </div>
  )
}
