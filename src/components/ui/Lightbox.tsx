import { useEffect } from 'react'
import { X } from 'lucide-react'

/** Visor de imagen a pantalla completa. Pasa `src` para abrir; `null` lo mantiene cerrado. */
export function Lightbox({ src, onClose }: { src: string | null; onClose: () => void }) {
  useEffect(() => {
    if (!src) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [src, onClose])

  if (!src) return null

  return (
    <div className="lightbox" onClick={onClose}>
      <button className="icon-btn lightbox-close" onClick={onClose} aria-label="Cerrar"><X size={20} /></button>
      <img src={src} alt="" className="lightbox-img" onClick={(e) => e.stopPropagation()} />
    </div>
  )
}
