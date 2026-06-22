import * as RS from '@radix-ui/react-select'
import { ChevronDown, Check } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  value: string
  onValueChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  ariaLabel?: string
  size?: 'sm' | 'md'
}

/**
 * Select accesible (Radix) estilado con el sistema de diseño.
 * Teclado, foco y ARIA los maneja Radix; el look es nuestro CSS.
 */
export function Select({ value, onValueChange, options, placeholder, ariaLabel, size = 'md' }: SelectProps) {
  return (
    <RS.Root value={value} onValueChange={onValueChange}>
      <RS.Trigger className="ui-select-trigger" data-size={size} aria-label={ariaLabel}>
        <RS.Value placeholder={placeholder} />
        <RS.Icon><ChevronDown size={15} /></RS.Icon>
      </RS.Trigger>
      <RS.Portal>
        <RS.Content className="ui-select-content" position="popper" sideOffset={6}>
          <RS.Viewport>
            {options.map((o) => (
              <RS.Item key={o.value} value={o.value} className="ui-select-item">
                <RS.ItemText>{o.label}</RS.ItemText>
                <RS.ItemIndicator className="ui-select-check"><Check size={14} /></RS.ItemIndicator>
              </RS.Item>
            ))}
          </RS.Viewport>
        </RS.Content>
      </RS.Portal>
    </RS.Root>
  )
}
