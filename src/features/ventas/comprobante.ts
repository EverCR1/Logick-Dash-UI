import { pdf } from '@react-pdf/renderer'
import { createElement } from 'react'
import { ComprobanteVentaPDF } from './ComprobanteVentaPDF'
import type { Venta } from '@/types/venta'

async function generarBlob(venta: Venta): Promise<Blob> {
  const doc = createElement(ComprobanteVentaPDF, { venta }) as unknown as Parameters<typeof pdf>[0]
  return pdf(doc).toBlob()
}

/** Abre el comprobante PDF en una pestaña nueva. `tab` debe abrirse en el click para no ser bloqueada. */
export async function previsualizarComprobante(venta: Venta, tab?: Window | null): Promise<boolean> {
  const ventana = tab ?? window.open('', '_blank')
  try {
    const blob = await generarBlob(venta)
    const url = URL.createObjectURL(blob)
    if (ventana) { ventana.location.href = url } else { window.open(url, '_blank') }
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
    return true
  } catch {
    ventana?.close()
    return false
  }
}

/** Descarga el comprobante PDF (tamaño carta). */
export async function descargarComprobante(venta: Venta): Promise<boolean> {
  try {
    const blob = await generarBlob(venta)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Comprobante-${venta.numero_venta}.pdf`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
    return true
  } catch {
    return false
  }
}
