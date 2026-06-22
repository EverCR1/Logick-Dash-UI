import { Loader2 } from 'lucide-react'
import { I } from '@/components/icons'

// Rango por defecto: inicio de mes → hoy
export function rangoPorDefecto(): { desde: string; hasta: string } {
  const now = new Date()
  const inicio = new Date(now.getFullYear(), now.getMonth(), 1)
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  return { desde: iso(inicio), hasta: iso(now) }
}

// Paleta para donuts / barras
export const PALETA = ['#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899', '#ef4444', '#14b8a6']

export function EstadoCarga({ isLoading, isError, vacio, refetch, children, icono: Icono = I.Activity }: {
  isLoading: boolean; isError: boolean; vacio: boolean
  refetch: () => void; children: React.ReactNode; icono?: React.ComponentType<{ size?: number }>
}) {
  if (isLoading) return <div className="empty" style={{ padding: 70 }}><Loader2 size={26} className="spin" style={{ color: 'var(--accent)' }} /><div>Cargando…</div></div>
  if (isError) return (
    <div className="empty" style={{ padding: 70 }}><I.AlertCircle /><div>No se pudo cargar el reporte</div>
      <button className="btn" style={{ marginTop: 10 }} onClick={refetch}><I.Refresh /> Reintentar</button></div>
  )
  if (vacio) return <div className="empty" style={{ padding: 70 }}><Icono size={26} /><div>Sin datos para el período seleccionado</div></div>
  return <>{children}</>
}
