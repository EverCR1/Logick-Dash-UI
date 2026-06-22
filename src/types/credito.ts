import type { Paginado } from './producto'

export type CreditoEstado = 'activo' | 'abonado' | 'pagado'
export type PagoTipo = 'abono' | 'pago_total'

export interface PagoCredito {
  id: number
  credito_id: number
  monto: number
  fecha_pago: string
  tipo: PagoTipo
  observaciones: string | null
}

export interface Credito {
  id: number
  venta_id: number | null
  nombre_cliente: string
  capital: number
  producto_o_servicio_dado: string | null
  fecha_credito: string
  fecha_ultimo_pago: string | null
  ultima_cantidad_pagada: number | null
  capital_restante: number
  estado: CreditoEstado
  pagos: PagoCredito[]
  venta: { id: number; total: number } | null
}

export interface CreditoEstadisticas {
  total_creditos: number
  activos: number
  abonados: number
  pagados: number
  capital_pendiente_activos: number
  capital_pendiente_abonados: number
  total_recuperado: number
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
