import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Loader2, TriangleAlert, Copy } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { productosApi } from '@/lib/api'

/** Una subida pendiente: las fotos propias de una variante, o su copia. */
export interface TrabajoImagen {
  clave: string
  productoId: number
  nombre: string
  archivos: File[]
  principal: number
  /** Id del producto del que copiar; excluyente con `archivos`. */
  copiarDe?: number
}

type Estado = 'pendiente' | 'subiendo' | 'listo' | 'error'

interface SubidaImagenesProps {
  trabajos: TrabajoImagen[]
  /** Se invoca cuando el usuario cierra, con o sin fallos. */
  onTerminar: () => void
}

/**
 * Sube las imágenes de cada variante después de crear el lote.
 *
 * Va aparte de la creación a propósito. Los productos se crean todo-o-nada en
 * una transacción, pero las imágenes dependen de un servicio externo y se
 * suben cuando esa transacción ya cerró: si una falla, borrar los productos
 * sería peor que el problema. Aquí se reporta cuál falló y se puede reintentar
 * o dejarla para después desde la ficha del producto.
 */
export function SubidaImagenes({ trabajos, onTerminar }: SubidaImagenesProps) {
  const [estados, setEstados] = useState<Record<string, Estado>>(
    () => Object.fromEntries(trabajos.map((t) => [t.clave, 'pendiente' as Estado])),
  )
  const [corriendo, setCorriendo] = useState(false)
  // Evita que StrictMode dispare la subida dos veces en desarrollo
  const arrancado = useRef(false)

  const ejecutar = useCallback(async (pendientes: TrabajoImagen[]) => {
    setCorriendo(true)

    // Secuencial y no en paralelo: cada trabajo es una subida a ImgBB y el
    // progreso tiene que ser legible, no seis barras moviéndose a la vez.
    for (const trabajo of pendientes) {
      setEstados((e) => ({ ...e, [trabajo.clave]: 'subiendo' }))
      try {
        if (trabajo.copiarDe) {
          await productosApi.copiarImagenes(trabajo.copiarDe, [trabajo.productoId])
        } else {
          const subidas = await productosApi.subirImagenes(trabajo.productoId, trabajo.archivos)
          const elegida = subidas[trabajo.principal] ?? subidas[0]
          if (elegida) await productosApi.imagenPrincipal(trabajo.productoId, elegida.id)
        }
        setEstados((e) => ({ ...e, [trabajo.clave]: 'listo' }))
      } catch {
        setEstados((e) => ({ ...e, [trabajo.clave]: 'error' }))
      }
    }

    setCorriendo(false)
  }, [])

  useEffect(() => {
    if (arrancado.current) return
    arrancado.current = true
    // Las copias van al final: su origen tiene que estar subido primero
    void ejecutar([...trabajos].sort((a, b) => Number(!!a.copiarDe) - Number(!!b.copiarDe)))
  }, [trabajos, ejecutar])

  const fallidos = trabajos.filter((t) => estados[t.clave] === 'error')
  const listos = trabajos.filter((t) => estados[t.clave] === 'listo').length
  const terminado = !corriendo && listos + fallidos.length === trabajos.length

  return (
    <Modal
      open
      onOpenChange={(o) => { if (!o && terminado) onTerminar() }}
      title="Subiendo imágenes"
      description={`${listos} de ${trabajos.length} variantes`}
      footer={
        <>
          {terminado && fallidos.length > 0 && (
            <button type="button" className="btn" onClick={() => void ejecutar(fallidos)}>
              Reintentar {fallidos.length}
            </button>
          )}
          <button type="button" className="btn btn-primary" disabled={!terminado} onClick={onTerminar}>
            {corriendo && <Loader2 size={14} className="spin" />}
            {terminado ? (fallidos.length ? 'Continuar de todos modos' : 'Listo') : 'Subiendo…'}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Los productos ya existen: esto es lo que evita que el usuario crea
            que un fallo aquí perdió su trabajo. */}
        <div className="muted" style={{ fontSize: 12.5 }}>
          Las variantes ya se crearon. Si alguna imagen falla, puedes reintentarla
          o agregarla después desde la ficha del producto.
        </div>

        <ul className="subida-lista">
          {trabajos.map((t) => {
            const estado = estados[t.clave] ?? 'pendiente'
            return (
              <li key={t.clave} data-estado={estado}>
                <span className="subida-icono">
                  {estado === 'listo' && <Check size={14} />}
                  {estado === 'subiendo' && <Loader2 size={14} className="spin" />}
                  {estado === 'error' && <TriangleAlert size={14} />}
                  {estado === 'pendiente' && <span className="subida-punto" />}
                </span>
                <span className="subida-nombre">{t.nombre}</span>
                <span className="muted" style={{ fontSize: 11.5 }}>
                  {t.copiarDe ? <><Copy size={11} /> copia</> : `${t.archivos.length} ${t.archivos.length === 1 ? 'foto' : 'fotos'}`}
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </Modal>
  )
}
