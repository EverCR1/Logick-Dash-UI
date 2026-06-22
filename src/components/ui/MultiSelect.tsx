import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Check, ChevronDown, X } from 'lucide-react'

export interface MultiOption {
  value: number
  label: string
}

interface MultiSelectProps {
  options: MultiOption[]
  selected: number[]
  onChange: (selected: number[]) => void
  placeholder?: string
}

/**
 * Selector múltiple con checkboxes (Radix DropdownMenu) estilado con el sistema.
 * Se mantiene abierto al marcar opciones (onSelect preventDefault).
 */
export function MultiSelect({ options, selected, onChange, placeholder = 'Seleccionar…' }: MultiSelectProps) {
  const toggle = (value: number) => {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value])
  }

  const chips = options.filter((o) => selected.includes(o.value))

  return (
    <DropdownMenu.Root>
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
          {options.length === 0 && <div className="multi-item" style={{ color: 'var(--text-faint)' }}>Sin opciones</div>}
          {options.map((o) => {
            const checked = selected.includes(o.value)
            return (
              <DropdownMenu.Item
                key={o.value}
                className="multi-item"
                data-checked={checked}
                onSelect={(e) => { e.preventDefault(); toggle(o.value) }}
              >
                <span className="box">{checked && <Check size={11} />}</span>
                {o.label}
              </DropdownMenu.Item>
            )
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
