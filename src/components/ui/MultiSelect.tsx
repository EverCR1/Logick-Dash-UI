import { useState } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Check, ChevronDown, X, Search } from 'lucide-react'

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
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/**
 * Selector múltiple con checkboxes (Radix DropdownMenu) estilado con el sistema.
 * Se mantiene abierto al marcar opciones (onSelect preventDefault).
 */
export function MultiSelect({ options, selected, onChange, placeholder = 'Seleccionar…', searchable = false, searchPlaceholder = 'Buscar…' }: MultiSelectProps) {
  const [query, setQuery] = useState('')

  const toggle = (value: number) => {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value])
  }

  const chips = options.filter((o) => selected.includes(o.value))
  const q = norm(query.trim())
  const visibles = q ? options.filter((o) => norm(o.label).includes(q)) : options

  return (
    <DropdownMenu.Root onOpenChange={(o) => { if (!o) setQuery('') }}>
      <DropdownMenu.Trigger asChild>
        <button type="button" className="multi-trigger">
          {chips.length === 0 ? (
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
        <DropdownMenu.Content className="multi-content" align="start" sideOffset={6}>
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
                >
                  <span className="box">{checked && <Check size={11} />}</span>
                  <span className="multi-item-label">{o.label}</span>
                  {o.nivel != null && <span className="multi-item-nivel">{o.nivel === 0 ? 'Raíz' : `Nivel ${o.nivel}`}</span>}
                </DropdownMenu.Item>
              )
            })}
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
