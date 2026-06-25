import { useEffect, useMemo, useState } from 'react'
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
