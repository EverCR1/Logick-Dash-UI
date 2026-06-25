import { pdf } from '@react-pdf/renderer'
import { createElement } from 'react'
import { ReportePDF, type ReporteExportData } from './ReportePDF'

async function blob(data: ReporteExportData): Promise<Blob> {
  const doc = createElement(ReportePDF, { data }) as unknown as Parameters<typeof pdf>[0]
  return pdf(doc).toBlob()
}

const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export async function abrirReporte(data: ReporteExportData, tab?: Window | null): Promise<boolean> {
  const ventana = tab ?? window.open('', '_blank')
  try {
    const url = URL.createObjectURL(await blob(data))
    if (ventana) ventana.location.href = url; else window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
    return true
  } catch { ventana?.close(); return false }
}

export async function descargarReporte(data: ReporteExportData): Promise<boolean> {
  try {
    const url = URL.createObjectURL(await blob(data))
    const a = document.createElement('a')
    a.href = url; a.download = `${slug(data.titulo)}.pdf`
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
    return true
  } catch { return false }
}
