import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useDebounce } from '@/lib/hooks'
import type { Filtros } from './useFiltrosUrl'

/**
 * Búsqueda de una vista de detalle: se teclea en estado local y viaja a la URL
 * ya reposada, para no dejar una entrada de historial por pulsación.
 */
export function useBusquedaUrl(filtros: Filtros, setFiltros: (patch: Filtros) => void) {
  const [texto, setTexto] = useState(filtros.search ?? '')
  const reposado = useDebounce(texto)

  useEffect(() => {
    if (reposado !== (filtros.search ?? '')) setFiltros({ search: reposado, page: '' })
    // Solo debe reaccionar al texto reposado; `filtros` cambia en cada consulta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reposado])

  return [texto, setTexto] as const
}

export interface ItemFiltrado {
  tipo: 'producto' | 'servicio'
  id: number
  nombre: string
}

/**
 * Item por el que se llegó desde el resumen. Se muestra como chip removible
 * para que el recorte sea evidente incluso cuando no devuelve resultados.
 */
export function ChipItem({ item, onQuitar }: { item: ItemFiltrado | null; onQuitar: () => void }) {
  if (!item) return null

  return (
    <div className="det-chips">
      <span className="multi-chip">
        {item.tipo === 'producto' ? 'Producto' : 'Servicio'}: {item.nombre}
        <button type="button" aria-label="Quitar filtro de item" onClick={onQuitar}>
          <X size={12} />
        </button>
      </span>
    </div>
  )
}

/** Opciones de método de pago del punto de venta. */
export const OPCIONES_METODO = [
  { value: 'todos', label: 'Todos los métodos' },
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'mixto', label: 'Mixto' },
  { value: 'credito', label: 'Crédito' },
]
