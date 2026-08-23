import { useEffect, useMemo, useRef } from 'react'
import { ImagePlus, Star, Trash2, Copy } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'

/** Máximos que acepta el endpoint de subida (UploadImagesRequest). */
const MAX_ARCHIVOS = 10
const MAX_MB = 5

/** Imágenes de una variante: propias, o las mismas que otra. */
export interface ImagenesDeVariante {
  archivos: File[]
  principal: number
  /** Clave de la variante de la que se copian; excluyente con `archivos`. */
  mismasQue: string | null
}

export const IMAGENES_VACIAS: ImagenesDeVariante = { archivos: [], principal: 0, mismasQue: null }

/**
 * Valor para "no copiar de nadie". Radix Select prohíbe la cadena vacía —la
 * reserva para limpiar la selección— y lanza una excepción que rompe el modal.
 */
const SIN_COPIA = '__propias'

interface ImagenesVarianteProps {
  open: boolean
  onClose: () => void
  /** Nombre de la variante que se está editando. */
  nombre: string
  valor: ImagenesDeVariante
  onChange: (valor: ImagenesDeVariante) => void
  /** Otras variantes con imágenes propias, para "usar las mismas que…". */
  fuentes: { clave: string; nombre: string; cuantas: number }[]
}

/**
 * Imágenes de una sola variante.
 *
 * Lo normal es que cada variante tenga las suyas —una camiseta negra y una
 * blanca no comparten foto—, así que reutilizarlas es una acción secundaria y
 * no el punto de partida.
 */
export function ImagenesVariante({ open, onClose, nombre, valor, onChange, fuentes }: ImagenesVarianteProps) {
  const input = useRef<HTMLInputElement>(null)

  // Las URLs de objeto hay que liberarlas: crearlas en cada render dejaría un
  // blob vivo por pulsación de teclado en el resto del formulario.
  const previews = useMemo(() => valor.archivos.map((f) => URL.createObjectURL(f)), [valor.archivos])
  useEffect(() => () => previews.forEach(URL.revokeObjectURL), [previews])

  const agregar = (lista: FileList | null) => {
    if (!lista) return
    const validos = Array.from(lista).filter((f) => {
      if (!f.type.startsWith('image/')) return false
      if (f.size > MAX_MB * 1024 * 1024) return false
      return true
    })
    onChange({
      ...valor,
      mismasQue: null,
      archivos: [...valor.archivos, ...validos].slice(0, MAX_ARCHIVOS),
    })
  }

  const quitar = (i: number) => {
    const archivos = valor.archivos.filter((_, idx) => idx !== i)
    onChange({
      ...valor,
      archivos,
      // Si se elimina la principal, la primera que quede toma su lugar
      principal: valor.principal >= archivos.length ? 0 : valor.principal,
    })
  }

  const usarDeOtra = (clave: string) =>
    onChange(clave !== SIN_COPIA ? { archivos: [], principal: 0, mismasQue: clave } : IMAGENES_VACIAS)

  const origen = fuentes.find((f) => f.clave === valor.mismasQue)

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} title="Imágenes de la variante" description={nombre}
      footer={<button type="button" className="btn btn-primary" onClick={onClose}>Listo</button>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {valor.mismasQue ? (
          <div className="aviso-inline" data-tono="warn">
            <Copy size={13} />
            <span>
              Usará las mismas imágenes que <b>{origen?.nombre ?? 'otra variante'}</b>.
              Se copian sin volver a subirlas.
            </span>
          </div>
        ) : (
          <>
            <input ref={input} type="file" accept="image/*" multiple hidden
              onChange={(e) => { agregar(e.target.files); e.target.value = '' }} />

            <button type="button" className="img-drop" onClick={() => input.current?.click()}>
              <ImagePlus size={20} />
              <span>Seleccionar imágenes</span>
              <span className="muted" style={{ fontSize: 11.5 }}>
                Hasta {MAX_ARCHIVOS} archivos de {MAX_MB} MB
              </span>
            </button>

            {valor.archivos.length > 0 && (
              <div className="img-previews">
                {valor.archivos.map((archivo, i) => (
                  <div key={i} className="img-preview" data-principal={i === valor.principal || undefined}>
                    <img src={previews[i]} alt={archivo.name} />
                    <div className="img-preview-acciones">
                      <button type="button" title="Marcar como principal"
                        onClick={() => onChange({ ...valor, principal: i })}>
                        <Star size={13} fill={i === valor.principal ? 'currentColor' : 'none'} />
                      </button>
                      <button type="button" title="Quitar" onClick={() => quitar(i)}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Reutilizar es la excepción, así que va al final y sin protagonismo */}
        {fuentes.length > 0 && (
          <div className="form-field">
            <label>Usar las mismas que otra variante</label>
            <Select
              value={valor.mismasQue ?? SIN_COPIA}
              onValueChange={usarDeOtra}
              placeholder="No, tiene las suyas"
              options={[
                { value: SIN_COPIA, label: 'No, tiene las suyas' },
                ...fuentes.map((f) => ({ value: f.clave, label: `${f.nombre} (${f.cuantas})` })),
              ]}
            />
          </div>
        )}
      </div>
    </Modal>
  )
}
