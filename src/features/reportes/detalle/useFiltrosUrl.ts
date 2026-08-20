import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

export type Filtros = Record<string, string>

/**
 * Filtros de la vista de detalle guardados en la query string.
 *
 * Vivir en la URL —y no en useState— es lo que hace que el enlace sea
 * compartible ("mírate estas ventas con margen bajo"), que el botón atrás
 * deshaga un filtro y que volver desde una venta no pierda el recorte.
 *
 * Los valores vacíos se borran del query en vez de quedar como `x=`, para que
 * la URL refleje solo lo que está realmente aplicado.
 */
export function useFiltrosUrl(iniciales: Filtros = {}) {
  const [params, setParams] = useSearchParams()

  const filtros = useMemo<Filtros>(() => {
    const out: Filtros = { ...iniciales }
    params.forEach((valor, clave) => { if (valor !== '') out[clave] = valor })
    return out
    // `iniciales` se re-crea en cada render del llamador; solo interesa su
    // contenido la primera vez, cuando aún no hay nada en la URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])

  /** Aplica cambios parciales. Volver a la página 1 es responsabilidad del que llama. */
  const setFiltros = useCallback((patch: Filtros) => {
    setParams((prev) => {
      const siguiente = new URLSearchParams(prev)
      for (const [clave, valor] of Object.entries(patch)) {
        if (valor === '' || valor == null) siguiente.delete(clave)
        else siguiente.set(clave, valor)
      }
      return siguiente
    }, { replace: true })
  }, [setParams])

  /** Deja solo las claves indicadas (típicamente el rango de fechas). */
  const limpiar = useCallback((conservar: string[] = []) => {
    setParams((prev) => {
      const siguiente = new URLSearchParams()
      for (const clave of conservar) {
        const valor = prev.get(clave)
        if (valor) siguiente.set(clave, valor)
      }
      return siguiente
    }, { replace: true })
  }, [setParams])

  return { filtros, setFiltros, limpiar }
}

/** Convierte los filtros a los parámetros que espera la API, omitiendo vacíos. */
export function aParams(filtros: Filtros): Record<string, string> {
  return Object.fromEntries(Object.entries(filtros).filter(([, v]) => v !== '' && v != null))
}
