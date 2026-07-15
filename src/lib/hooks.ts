import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import type { PageMeta } from '@/components/ui/Pagination'

/** Devuelve el valor tras `delay` ms sin cambios. Útil para búsquedas. */
export function useDebounce<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

/**
 * Calcula cuántos ítems caben por página en un grid de cards responsivo, para que
 * la página siempre llene el ancho disponible (mismas columnas que produce el CSS
 * `repeat(auto-fill, minmax(minCol, 1fr))`) en vez de un `per_page` fijo que deja
 * huecos o corta filas a la mitad.
 *
 * Uso: `const { ref, perPage } = useAutoPageSize({ minCol: 220, rows: 4 })`
 * y pasar `ref` al contenedor del grid (el mismo que tiene la clase con ese grid-template-columns).
 */
export function useAutoPageSize({ minCol, rows = 4 }: { minCol: number; rows?: number }) {
  // El contenedor solo existe en el DOM una vez que termina de cargar (isLoading
  // pasa a false); con un useRef normal + efecto de deps fijas, ese efecto corre
  // una sola vez ANTES de que el nodo exista y nunca vuelve a intentarlo. Un ref
  // por callback sí se re-ejecuta cada vez que React monta/desmonta el nodo real
  // (recarga de página, cambio de vista, etc.), así que es la forma correcta de
  // medir un contenedor que aparece condicionalmente.
  const [node, setNode] = useState<HTMLDivElement | null>(null)
  const ref = useCallback((el: HTMLDivElement | null) => setNode(el), [])

  // Estimación inicial razonable (se corrige apenas el contenedor exista)
  const [perPage, setPerPage] = useState(rows * 4)

  useLayoutEffect(() => {
    if (!node) return

    let frame = 0
    const calcular = () => {
      const width = node.clientWidth
      if (width <= 0) return
      // Lee el gap real del grid (respeta --gap-grid / data-density) en vez de asumirlo
      const gap = parseFloat(getComputedStyle(node).columnGap) || 0
      const cols = Math.max(1, Math.floor((width + gap) / (minCol + gap)))
      const siguiente = cols * rows
      setPerPage((prev) => (prev === siguiente ? prev : siguiente))
    }

    calcular()
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(calcular)
    })
    ro.observe(node)
    return () => { ro.disconnect(); cancelAnimationFrame(frame) }
  }, [node, minCol, rows])

  return { ref, perPage }
}

/** Paginación en cliente para listas ya cargadas en memoria. */
export function usePaginacionLocal<T>(items: T[], perPage = 15) {
  const [page, setPage] = useState(1)
  const total = items.length
  const lastPage = Math.max(1, Math.ceil(total / perPage))

  // Si la lista cambia (filtros) y la página queda fuera de rango, vuelve a 1
  useEffect(() => { setPage(1) }, [total])

  const pagina = Math.min(page, lastPage)
  const slice = useMemo(() => items.slice((pagina - 1) * perPage, pagina * perPage), [items, pagina, perPage])
  const meta: PageMeta = {
    current_page: pagina,
    last_page: lastPage,
    total,
    from: total === 0 ? 0 : (pagina - 1) * perPage + 1,
    to: Math.min(pagina * perPage, total),
  }
  return { slice, meta, page: pagina, setPage }
}
