/**
 * Tipos de movimiento del saldo a favor. Los dos primeros lo aumentan y los dos
 * últimos lo consumen; el campo `monto` ya viene con el signo correspondiente.
 */
export type TipoMovimientoSaldo = 'anticipo' | 'devolucion' | 'aplicado_venta' | 'reembolsado' | 'ajuste'

export interface MovimientoSaldo {
  id: number
  cliente_id: number
  tipo: TipoMovimientoSaldo
  /** Con signo: positivo suma al saldo, negativo lo gasta. */
  monto: number
  venta_id: number | null
  devolucion_id: number | null
  usuario_id: number
  fecha: string
  concepto: string | null
  created_at: string
  cliente?: { id: number; nombre: string } | null
  venta?: { id: number; numero_venta: string } | null
  devolucion?: { id: number; numero_devolucion: string } | null
  usuario?: { id: number; nombres: string; apellidos: string } | null
}

export interface SaldoDeCliente {
  success: boolean
  cliente: { id: number; nombre: string; nit: string | null }
  saldo: number
  movimientos: MovimientoSaldo[]
}

export interface MovimientoSaldoPayload {
  cliente_id: number
  monto: number
  fecha?: string | null
  concepto: string
}
