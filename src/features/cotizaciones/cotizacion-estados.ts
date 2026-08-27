import type { Cotizacion, CotizacionEstado } from '@/types/cotizacion'

export const ESTADO_COTIZACION: Record<CotizacionEstado, { label: string; tone?: 'pos' | 'neg' | 'warn' | 'info' | 'violet' }> = {
  borrador:   { label: 'Borrador' },
  enviada:    { label: 'Enviada', tone: 'info' },
  aceptada:   { label: 'Aceptada', tone: 'pos' },
  rechazada:  { label: 'Rechazada', tone: 'neg' },
  convertida: { label: 'Convertida', tone: 'violet' },
}

/** Estados a los que se puede mover a mano. Convertida no está: la pone la venta. */
export const ESTADOS_MANUALES = ['borrador', 'enviada', 'aceptada', 'rechazada'] as const

export const ESTADO_OPCIONES = [
  { value: 'todos', label: 'Todos los estados' },
  { value: 'vigente', label: 'Vigentes' },
  { value: 'vencida', label: 'Vencidas' },
  ...ESTADOS_MANUALES.map((e) => ({ value: e, label: ESTADO_COTIZACION[e].label })),
  { value: 'convertida', label: 'Convertidas' },
]

/**
 * Lo que se muestra como estado.
 *
 * "Vencida" pesa más que "borrador" o "enviada": es la información que cambia
 * lo que hay que hacer con la cotización. Pero no tapa a aceptada, rechazada ni
 * convertida, que son cierres y no dependen de la fecha.
 */
export function estadoVisible(c: Cotizacion): { label: string; tone?: 'pos' | 'neg' | 'warn' | 'info' | 'violet' } {
  if (c.esta_vencida) return { label: 'Vencida', tone: 'warn' }
  return ESTADO_COTIZACION[c.estado]
}

/** Días que faltan para que venza. Negativo = ya venció. */
export function diasRestantes(validoHasta: string): number {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const hasta = new Date(`${validoHasta}T00:00:00`)
  return Math.round((hasta.getTime() - hoy.getTime()) / 86_400_000)
}
