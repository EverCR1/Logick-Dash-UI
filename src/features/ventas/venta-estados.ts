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
