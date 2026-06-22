import type { PedidoEstado } from '@/types/pedido'

export const ESTADO_PEDIDO: Record<PedidoEstado, { label: string; tone?: 'pos' | 'neg' | 'warn' }> = {
  pendiente: { label: 'Pendiente', tone: 'warn' },
  confirmado: { label: 'Confirmado' },
  en_preparacion: { label: 'En preparación' },
  enviado: { label: 'Enviado' },
  entregado: { label: 'Entregado', tone: 'pos' },
  cancelado: { label: 'Cancelado', tone: 'neg' },
}

export const ESTADO_OPCIONES: { value: PedidoEstado; label: string }[] = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'confirmado', label: 'Confirmado' },
  { value: 'en_preparacion', label: 'En preparación' },
  { value: 'enviado', label: 'Enviado' },
  { value: 'entregado', label: 'Entregado' },
  { value: 'cancelado', label: 'Cancelado' },
]
