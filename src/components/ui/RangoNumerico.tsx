import { X } from 'lucide-react'

interface RangoNumericoProps {
  min: string
  max: string
  onChange: (rango: { min: string; max: string }) => void
  /** Símbolo dentro del campo, p. ej. "Q" para moneda. */
  prefijo?: string
  etiqueta?: string
  placeholderMin?: string
  placeholderMax?: string
  step?: number
  onLimpiar?: () => void
}

/**
 * Filtro de rango numérico (precio, monto). Los valores viajan como string para
 * poder representar "sin filtro" con cadena vacía: 0 es un valor legítimo y no
 * puede usarse como centinela. Quien lo consume convierte a número al enviar.
 *
 * No lleva debounce propio: el patrón del dashboard es que la página aplique
 * `useDebounce` sobre el valor antes de meterlo en la queryKey, igual que con la
 * búsqueda, para no disparar una petición por cada tecla.
 */
export function RangoNumerico({
  min, max, onChange, prefijo, etiqueta,
  placeholderMin = 'Mín', placeholderMax = 'Máx', step = 1, onLimpiar,
}: RangoNumericoProps) {
  const hayRango = !!(min || max)

  // Sin tope superior, un mínimo mayor que el máximo devuelve 0 filas sin avisar.
  const invertido = !!(min && max && Number(min) > Number(max))

  return (
    <div className="rango-numerico" data-invalido={invertido || undefined}>
      {etiqueta && <span className="rango-etiqueta">{etiqueta}</span>}

      <div className="rango-campo">
        {prefijo && <span className="rango-prefijo">{prefijo}</span>}
        <input type="number" className="form-input" value={min} min={0} step={step}
          placeholder={placeholderMin} aria-label={`${etiqueta ?? 'Rango'} mínimo`}
          onChange={(e) => onChange({ min: e.target.value, max })} />
      </div>

      <span className="muted" style={{ fontSize: 12 }}>—</span>

      <div className="rango-campo">
        {prefijo && <span className="rango-prefijo">{prefijo}</span>}
        <input type="number" className="form-input" value={max} min={0} step={step}
          placeholder={placeholderMax} aria-label={`${etiqueta ?? 'Rango'} máximo`}
          onChange={(e) => onChange({ min, max: e.target.value })} />
      </div>

      {onLimpiar && hayRango && (
        <button type="button" className="icon-btn" onClick={onLimpiar} title="Quitar filtro" aria-label="Quitar filtro">
          <X size={14} />
        </button>
      )}
    </div>
  )
}
