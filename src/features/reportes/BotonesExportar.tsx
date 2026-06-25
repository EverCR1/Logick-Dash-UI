import { useState } from 'react'
import { toast } from 'sonner'
import { Eye, Download, Loader2 } from 'lucide-react'
import type { ReporteExportData } from './ReportePDF'

/** Botones Previsualizar / Descargar PDF. `data` se construye en el tab con sus datos cargados. */
export function BotonesExportar({ data }: { data: ReporteExportData | null }) {
  const [cargando, setCargando] = useState<'ver' | 'descargar' | null>(null)
  const deshabilitado = !data || cargando !== null

  const previsualizar = async () => {
    if (!data) return
    const tab = window.open('', '_blank') // abrir en el gesto del click
    setCargando('ver')
    try {
      const { abrirReporte } = await import('./reportes-export')
      if (!(await abrirReporte(data, tab))) toast.error('No se pudo abrir el reporte')
    } finally { setCargando(null) }
  }

  const descargar = async () => {
    if (!data) return
    setCargando('descargar')
    try {
      const { descargarReporte } = await import('./reportes-export')
      if (!(await descargarReporte(data))) toast.error('No se pudo generar el PDF')
    } finally { setCargando(null) }
  }

  return (
    <div className="rep-export">
      <button className="btn btn-sm" onClick={previsualizar} disabled={deshabilitado}>
        {cargando === 'ver' ? <Loader2 size={14} className="spin" /> : <Eye size={14} />} Previsualizar
      </button>
      <button className="btn btn-sm btn-primary" onClick={descargar} disabled={deshabilitado}>
        {cargando === 'descargar' ? <Loader2 size={14} className="spin" /> : <Download size={14} />} PDF
      </button>
    </div>
  )
}
