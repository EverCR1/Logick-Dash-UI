import { useState, useEffect, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, Star, Trash2, ImagePlus } from 'lucide-react'
import { productosApi } from '@/lib/api'
import type { ImagenProducto } from '@/types/producto'

export function ProductoImagenes({ productoId, imagenes }: { productoId: number; imagenes: ImagenProducto[] }) {
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [imgs, setImgs] = useState<ImagenProducto[]>(imagenes)

  useEffect(() => { setImgs(imagenes) }, [imagenes, productoId])

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ['productos'] })

  const subir = useMutation({
    mutationFn: (files: File[]) => productosApi.subirImagenes(productoId, files),
    onSuccess: (nuevas) => {
      setImgs((prev) => [...prev, ...nuevas])
      toast.success(nuevas.length === 1 ? 'Imagen subida' : `${nuevas.length} imágenes subidas`)
      invalidar()
    },
    onError: () => toast.error('No se pudieron subir las imágenes'),
  })

  const principal = useMutation({
    mutationFn: (imagenId: number) => productosApi.imagenPrincipal(productoId, imagenId),
    onSuccess: (_d, imagenId) => {
      setImgs((prev) => prev.map((i) => ({ ...i, es_principal: i.id === imagenId })))
      invalidar()
    },
    onError: () => toast.error('No se pudo marcar como principal'),
  })

  const eliminar = useMutation({
    mutationFn: (imagenId: number) => productosApi.eliminarImagen(productoId, imagenId),
    onSuccess: (_d, imagenId) => {
      setImgs((prev) => {
        const quedan = prev.filter((i) => i.id !== imagenId)
        // Si se borró la principal, el backend promueve la primera; reflejarlo localmente
        if (!quedan.some((i) => i.es_principal) && quedan.length > 0) quedan[0] = { ...quedan[0], es_principal: true }
        return quedan
      })
      toast.success('Imagen eliminada')
      invalidar()
    },
    onError: () => toast.error('No se pudo eliminar la imagen'),
  })

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length) subir.mutate(files)
    if (inputRef.current) inputRef.current.value = ''
  }

  const ocupado = subir.isPending || principal.isPending || eliminar.isPending

  return (
    <div className="col-2" style={{ display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={onPick} />
        <button type="button" className="btn" onClick={() => inputRef.current?.click()} disabled={subir.isPending}>
          {subir.isPending ? <Loader2 size={14} className="spin" /> : <ImagePlus size={14} />} Subir imágenes
        </button>
        <span className="muted" style={{ fontSize: 11.5 }}>La estrella marca la imagen principal.</span>
      </div>

      {imgs.length === 0 ? (
        <div className="muted" style={{ fontSize: 12.5 }}>Sin imágenes todavía.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 8 }}>
          {imgs.map((img) => (
            <div key={img.id} style={{ position: 'relative', aspectRatio: '1', borderRadius: 8, overflow: 'hidden', border: img.es_principal ? '2px solid var(--accent)' : '1px solid var(--border)' }}>
              <img src={img.url_thumb ?? img.url_medium ?? img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', top: 4, right: 4, display: 'flex', gap: 4 }}>
                <button type="button" className="icon-btn" disabled={ocupado || img.es_principal} title={img.es_principal ? 'Imagen principal' : 'Marcar como principal'}
                  onClick={() => principal.mutate(img.id)}
                  style={{ background: 'rgba(0,0,0,.55)', color: img.es_principal ? '#f59e0b' : '#fff', width: 24, height: 24 }}>
                  <Star size={13} fill={img.es_principal ? '#f59e0b' : 'none'} />
                </button>
                <button type="button" className="icon-btn" disabled={ocupado} title="Eliminar"
                  onClick={() => eliminar.mutate(img.id)}
                  style={{ background: 'rgba(0,0,0,.55)', color: '#fca5a5', width: 24, height: 24 }}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
