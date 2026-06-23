import type { MetodoPago, VentaEstado } from '@/types/venta'

export const ESTADO_VENTA: Record<VentaEstado, { label: string; tone?: 'pos' | 'neg' | 'warn' }> = {
  completada: { label: 'Completada', tone: 'pos' },
  pendiente: { label: 'Pendiente', tone: 'warn' },
  cancelada: { label: 'Cancelada', tone: 'neg' },
}

export const METODO_LABEL: Record<MetodoPago, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
  mixto: 'Mixto',
  credito: 'Crédito',
}

export const METODO_OPCIONES = (Object.entries(METODO_LABEL) as [MetodoPago, string][]).map(([value, label]) => ({ value, label }))

// Tono del badge por método (para index y show)
export const METODO_TONE: Record<MetodoPago, 'pos' | 'info' | 'warn' | 'violet' | undefined> = {
  efectivo: 'pos',
  tarjeta: 'info',
  transferencia: 'violet',
  mixto: undefined,
  credito: 'warn',
}

// Colores para el comprobante PDF (fondo / texto)
export const METODO_COLOR_PDF: Record<MetodoPago, { bg: string; text: string }> = {
  efectivo:      { bg: '#f0fdf4', text: '#15803d' },
  tarjeta:       { bg: '#eff6ff', text: '#1e40af' },
  transferencia: { bg: '#f5f3ff', text: '#6d28d9' },
  mixto:         { bg: '#f4f4f5', text: '#52525b' },
  credito:       { bg: '#fffbeb', text: '#92400e' },
}
