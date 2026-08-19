import { useState } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Check, ChevronDown, X, Search } from 'lucide-react'
import { coincideBusqueda } from '@/lib/text'

export interface MultiOption {
  value: number
  label: string
  /** Nivel jerárquico para sangría visual (0 = raíz) */
  nivel?: number
}

interface MultiSelectProps {
  options: MultiOption[]
  selected: number[]
  onChange: (selected: number[]) => void
  placeholder?: string
  searchable?: boolean
  searchPlaceholder?: string
  /**
   * Resume la selección en una línea ("3 categorías") en vez de listar chips.
   * Pensado para barras de filtros, donde los chips ensancharían la toolbar
   * cada vez que se marca una opción.
   */
  compacto?: boolean
  /** Palabra para el resumen en plural: "3 categorías". */
  sustantivo?: string
  /**
   * Etiqueta "Raíz" / "Nivel N" junto a cada opción. Útil al asignar categorías,
   * donde el nivel es un dato a considerar; en un filtro solo resta ancho al
   * nombre, y la sangría ya comunica la jerarquía.
   */
  mostrarNivel?: boolean
}

/**
 * Selector múltiple con checkboxes (Radix DropdownMenu) estilado con el sistema.
 * Se mantiene abierto al marcar opciones (onSelect preventDefault).
 */
export function MultiSelect({
  options, selected, onChange, placeholder = 'Seleccionar…',
  searchable = false, searchPlaceholder = 'Buscar…', compacto = false, sustantivo,
  mostrarNivel = true,
}: MultiSelectProps) {
  const [query, setQuery] = useState('')

  const toggle = (value: number) => {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value])
  }

  const chips = options.filter((o) => selected.includes(o.value))
  const visibles = options.filter((o) => coincideBusqueda(query, o.label))

  // Con una sola opción marcada se muestra su nombre; con varias, el conteo.
  const resumen = chips.length === 0
    ? placeholder
    : chips.length === 1
      ? chips[0].label
      : `${chips.length} ${sustantivo ?? 'seleccionadas'}`

  return (
    <DropdownMenu.Root onOpenChange={(o) => { if (!o) setQuery('') }}>
      <DropdownMenu.Trigger asChild>
        <button type="button" className="multi-trigger" data-compacto={compacto || undefined}>
          {compacto ? (
            <span className={chips.length === 0 ? 'ph' : 'multi-resumen'}>{resumen}</span>
          ) : chips.length === 0 ? (
            <span className="ph">{placeholder}</span>
          ) : (
            chips.map((c) => (
              <span key={c.value} className="multi-chip">
                {c.label}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggle(c.value) }}
                  aria-label={`Quitar ${c.label}`}
                >
                  <X size={12} />
                </button>
              </span>
            ))
          )}
          <ChevronDown size={15} style={{ marginLeft: 'auto', color: 'var(--text-muted)', flexShrink: 0 }} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="multi-content" data-compacto={compacto || undefined} align="start" sideOffset={6}>
          {searchable && (
            <div className="multi-search" onKeyDown={(e) => e.stopPropagation()}>
              <Search size={14} />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
              />
            </div>
          )}
          <div className="multi-list">
            {visibles.length === 0 && <div className="multi-item" style={{ color: 'var(--text-faint)' }}>{options.length === 0 ? 'Sin opciones' : 'Sin resultados'}</div>}
            {visibles.map((o) => {
              const checked = selected.includes(o.value)
              return (
                <DropdownMenu.Item
                  key={o.value}
                  className="multi-item"
                  data-checked={checked}
                  onSelect={(e) => { e.preventDefault(); toggle(o.value) }}
                  style={o.nivel ? { paddingLeft: 10 + o.nivel * 16 } : undefined}
                  // Los nombres largos se recortan con ellipsis; el title los muestra completos
                  title={o.label}
                >
                  <span className="box">{checked && <Check size={11} />}</span>
                  <span className="multi-item-label">{o.label}</span>
                  {mostrarNivel && o.nivel != null && <span className="multi-item-nivel">{o.nivel === 0 ? 'Raíz' : `Nivel ${o.nivel}`}</span>}
                </DropdownMenu.Item>
              )
            })}
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
