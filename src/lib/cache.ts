import type { QueryClient } from '@tanstack/react-query'

/**
 * Raíz de las consultas del catálogo del POS: el buscador de la vista formulario
 * y las dos rejillas de la terminal.
 *
 * Comparten prefijo a propósito, para poder invalidarlas de una sola vez desde
 * cualquier pantalla que mueva stock o precios, sin que quien invalida tenga que
 * conocer cómo está partido el catálogo por dentro.
 */
export const CATALOGO_POS = 'venta-catalogo'

/**
 * Invalida todo lo que muestra stock, precio o datos de un producto.
 *
 * El catálogo del POS no lo invalidaba nadie. Con el staleTime de un minuto que
 * usa la app, al volver a la pantalla de venta después de registrar una —o de
 * ajustar stock, cambiar un precio o cancelar un pedido— seguía anunciando las
 * cifras anteriores hasta que se recargaba la página a mano.
 */
export function invalidarProductos(qc: QueryClient): void {
  for (const key of [['productos'], [CATALOGO_POS]]) {
    qc.invalidateQueries({ queryKey: key })
  }
}
