import type { Paginado } from './producto'

export type MetodoReembolso = 'efectivo' | 'tarjeta' | 'transferencia'

export interface DevolucionDetalle {
  id: number
  venta_detalle_id: number
  tipo: 'producto' | 'servicio'
  producto_id: number | null
  servicio_id: number | null
  descripcion: string
  cantidad: number
  /** Lo que el cliente pagó por unidad, con el descuento de la línea repartido. */
  precio_unitario: number
  costo: number | null
  total: number
  vuelve_a_inventario: boolean
}

export interface Devolucion {
  id: number
  numero_devolucion: string
  venta_id: number
  cliente_id: number | null
  sucursal_id: number | null
  usuario_id: number
  fecha: string
  motivo: string
  total: number
  /** Cuánto bajó la deuda en vez de salir de la caja. */
  aplicado_a_deuda: number
  reembolsado: number
  /** Lo que quedó a favor del cliente en vez de salir en efectivo. */
  aplicado_a_saldo: number
  /** Nulo cuando todo se aplicó a la deuda: no salió dinero. */
  metodo_reembolso: MetodoReembolso | null
  created_at: string
  venta?: { id: number; numero_venta: string } | null
  cliente?: { id: number; nombre: string } | null
  sucursal?: { id: number; nombre: string } | null
  usuario?: { id: number; nombres: string; apellidos: string } | null
  detalles?: DevolucionDetalle[]
}

/** Una línea de la venta, con cuánto queda por devolver de ella. */
export interface LineaDevolvible {
  venta_detalle_id: number
  tipo: 'producto' | 'servicio'
  descripcion: string
  producto_id: number | null
  servicio_id: number | null
  cantidad_vendida: number
  cantidad_devuelta: number
  /** Vendida menos lo ya devuelto en tandas anteriores. */
  devolvible: number
  precio_unitario: number
}

export interface DevolvibleResponse {
  success: boolean
  venta: {
    id: number
    numero_venta: string
    estado: string
    metodo_pago: string
    total: number
    created_at: string
  }
  /** Si hay deuda viva, la devolución la baja antes de tocar la caja. */
  deuda_pendiente: number
  /** Dejar lo devuelto a cuenta necesita un cliente identificado. */
  admite_saldo: boolean
  saldo_actual: number
  lineas: LineaDevolvible[]
}

export interface DevolucionPayload {
  venta_id: number
  lineas: { venta_detalle_id: number; cantidad: number; vuelve_a_inventario?: boolean }[]
  fecha?: string | null
  motivo: string
  /** A dónde va lo que no se aplique a la deuda. */
  destino?: 'efectivo' | 'saldo'
  metodo_reembolso?: MetodoReembolso | null
}

export interface DevolucionFiltros {
  search?: string
  venta_id?: number
  sucursal_id?: number | string
  fecha_inicio?: string
  fecha_fin?: string
  sort?: 'fecha_desc' | 'fecha_asc' | 'monto_desc' | 'monto_asc'
  page?: number
  per_page?: number
}

/** Totales sobre el filtro completo, no sobre la página visible. */
export interface DevolucionEstadisticas {
  total_devoluciones: number
  valor_devuelto: number
  salio_de_caja: number
  bajo_deuda: number
  quedo_a_favor: number
}

export interface DevolucionesResponse {
  success: boolean
  devoluciones: Paginado<Devolucion>
  estadisticas: DevolucionEstadisticas
}
