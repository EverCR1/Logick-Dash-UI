import { pdf } from '@react-pdf/renderer'
import { createElement } from 'react'
import { CotizacionPDF } from './CotizacionPDF'
import { resolverImagenes } from './imagenes-pdf'
import type { Cotizacion } from '@/types/cotizacion'

/**
 * Las imágenes se resuelven antes de renderizar porque react-pdf construye el
 * documento de forma síncrona: si se le pasara una URL de WebP no sabría qué
 * hacer con ella, y si se le pasara una promesa tampoco esperaría.
 */
async function generarBlob(cotizacion: Cotizacion): Promise<Blob> {
  const imagenes = await resolverImagenes(cotizacion)
  const doc = createElement(CotizacionPDF, { cotizacion, imagenes }) as unknown as Parameters<typeof pdf>[0]
  return pdf(doc).toBlob()
}

/** Abre la cotización en una pestaña nueva. `tab` debe abrirse en el click para no ser bloqueada. */
export async function previsualizarCotizacion(cotizacion: Cotizacion, tab?: Window | null): Promise<boolean> {
  const ventana = tab ?? window.open('', '_blank')
  try {
    const blob = await generarBlob(cotizacion)
    const url = URL.createObjectURL(blob)
    if (ventana) { ventana.location.href = url } else { window.open(url, '_blank') }
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
    return true
  } catch {
    ventana?.close()
    return false
  }
}

/** Descarga la cotización en PDF (tamaño carta). */
export async function descargarCotizacion(cotizacion: Cotizacion): Promise<boolean> {
  try {
    const blob = await generarBlob(cotizacion)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Cotizacion-${cotizacion.numero_cotizacion}.pdf`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
    return true
  } catch {
    return false
  }
}
