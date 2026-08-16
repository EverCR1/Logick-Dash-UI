import { Loader2, X } from 'lucide-react'
import { I } from '@/components/icons'

interface BuscadorToolbarProps {
  value: string
  onChange: (valor: string) => void
  placeholder?: string
  /** Muestra el spinner mientras la consulta se está refrescando. */
  cargando?: boolean
  autoFocus?: boolean
}

/**
 * Campo de búsqueda de las barras de filtros. Incluye la X para vaciar el texto,
 * que evita tener que borrar a mano y hace innecesario el botón "Limpiar" cuando
 * la búsqueda es el único filtro aplicado.
 */
export function BuscadorToolbar({ value, onChange, placeholder = 'Buscar…', cargando, autoFocus }: BuscadorToolbarProps) {
  return (
    <div className="toolbar-search">
      <I.Search />
      <input
        placeholder={placeholder}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        // Escape vacía el campo sin sacar el foco: se puede seguir escribiendo
        onKeyDown={(e) => { if (e.key === 'Escape' && value) { e.preventDefault(); onChange('') } }}
      />
      {cargando && <Loader2 size={14} className="spin" style={{ color: 'var(--text-faint)' }} />}
      {value && (
        <button type="button" className="ts-clear" onClick={() => onChange('')} aria-label="Limpiar búsqueda" title="Limpiar búsqueda">
          <X size={14} />
        </button>
      )}
    </div>
  )
}
