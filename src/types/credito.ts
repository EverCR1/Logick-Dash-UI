import type { Paginado } from './producto'

/**
 * `activo` y `abonado` son los estados abiertos: el crédito sigue por cobrar,
 * con o sin abonos. Los otros tres son salidas — pagado (se cobró todo),
 * condonado (se decidió no cobrar el resto: es una pérdida) y anulado (no debió
 * existir: es una corrección, no una pérdida).
 */
export type CreditoEstado = 'activo' | 'abonado' | 'pagado' | 'condonado' | 'anulado'
/** `reversion` es la salida de un abono; su monto es negativo. */
export type PagoTipo = 'abono' | 'pago_total' | 'reversion'

export interface PagoCredito {
  id: number
  credito_id: number
  monto: number
  fecha_pago: string
  tipo: PagoTipo
  observaciones: string | null
  /** El abono que esta reversión deshace. Nulo en los abonos normales. */
  revierte_pago_id: number | null
}

export interface Credito {
  id: number
  venta_id: number | null
  /** Cliente del sistema. Nulo si se le fía a alguien que no está dado de alta. */
  cliente_id: number | null
  nombre_cliente: string
  capital: number
  producto_o_servicio_dado: string | null
  fecha_credito: string
  fecha_ultimo_pago: string | null
  ultima_cantidad_pagada: number | null
  capital_restante: number
  estado: CreditoEstado
  /** Saldo perdonado al condonar. Nulo en cualquier otro estado. */
  condonado_monto: number | null
  cerrado_at: string | null
  motivo_cierre: string | null
  pagos: PagoCredito[]
  venta: { id: number; total: number } | null
}

export interface CreditoEstadisticas {
  total_creditos: number
  /** Créditos por cobrar: incluye los abonados, que siguen debiendo. */
  activos: number
  /** Subconjunto de `activos`: los que ya recibieron al menos un abono. */
  abonados: number
  pagados: number
  /** Saldo de todos los créditos abiertos, en una sola cifra. */
  capital_pendiente: number
  total_recuperado: number
  condonados: number
  /** Dinero que se dejó de cobrar. Separado de lo anulado, que nunca fue deuda. */
  total_condonado: number
  anulados: number
}

export interface CreditoFiltros {
  search?: string
  estado?: string
  sort?: 'fecha_desc' | 'fecha_asc' | 'monto_desc' | 'monto_asc'
  page?: number
  per_page?: number
}

export interface CreditosResponse {
  success: boolean
  creditos: Paginado<Credito>
  estadisticas: CreditoEstadisticas
}

export interface CreditoPayload {
  /**
   * Venta que originó el crédito. Es lo que permite atribuirlo a su sucursal y a
   * su cliente en los reportes. Opcional: siguen existiendo créditos legítimos
   * sin venta, como deudas anteriores al sistema.
   */
  venta_id?: number | null
  /**
   * Cliente al que se liga la deuda. Es lo que la hace aparecer en su ficha
   * aunque el crédito no venga de una venta.
   */
  cliente_id?: number | null
  nombre_cliente: string
  capital: number
  producto_o_servicio_dado: string | null
  fecha_credito: string
  capital_restante: number
}

export interface RegistrarPagoPayload {
  monto: number
  tipo: PagoTipo
  observaciones?: string | null
  fecha_pago?: string | null
}
