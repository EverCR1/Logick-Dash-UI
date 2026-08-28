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
  /**
   * Radix emite '' al reconciliar cuando el valor controlado no tiene ningún
   * item montado — lo que ocurre siempre que las opciones llegan por consulta:
   * el formulario ya puso "3", pero la lista todavía está vacía.
   *
   * Ese aviso llegaba al formulario como si el usuario hubiera vaciado el campo
   * y borraba la selección real, así que cuando los datos llegaban ya no había
   * nada que marcar.
   *
   * Ignorarlo es seguro: Radix no admite items con valor vacío, de modo que un
   * '' nunca puede venir de una elección de la persona.
   */
  const cambiar = (nuevo: string) => {
    if (nuevo === '' && value !== '') return
    onValueChange(nuevo)
  }

  return (
    <RS.Root value={value} onValueChange={cambiar}>
      <RS.Trigger className="ui-select-trigger" data-size={size} aria-label={ariaLabel}>
        {/*
          La etiqueta se resuelve aquí, contra `options`, en vez de dejar que la
          deduzca Radix.

          Radix la saca de sus `Select.Item`, que viven en el Portal y solo se
          montan al abrir el desplegable. Con opciones que llegan por consulta
          —proveedores, sucursales, categorías— el primer render ocurre con la
          lista vacía: Radix no encuentra a qué corresponde el valor, pinta el
          placeholder y ya no lo reintenta cuando los datos llegan. El campo se
          veía vacío aunque el valor estuviera puesto.

          Resolviéndolo desde props, basta con que `options` cambie para que la
          etiqueta aparezca.
        */}
        <RS.Value placeholder={placeholder}>
          {options.find((o) => o.value === value)?.label}
        </RS.Value>
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
