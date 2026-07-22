import type { Paginado } from './producto'

export type VentaEstado = 'completada' | 'pendiente' | 'cancelada'
export type MetodoPago = 'efectivo' | 'tarjeta' | 'transferencia' | 'mixto' | 'credito'
export type ItemTipo = 'producto' | 'servicio' | 'otro'

export interface VentaDetalle {
  id: number
  venta_id: number
  tipo: ItemTipo
  cantidad: number
  descripcion: string
  precio_unitario: number
  descuento: number
  subtotal: number
  total: number
  producto_id: number | null
  servicio_id: number | null
  referencia: string | null
  producto?: { id: number; nombre: string; sku: string } | null
  servicio?: { id: number; nombre: string } | null
}

export interface Venta {
  id: number
  numero_venta: string
  cliente_id: number | null
  usuario_id: number | null
  sucursal_id: number | null
  estado: VentaEstado
  metodo_pago: MetodoPago
  subtotal: number
  descuento_total: number
  total: number
  observaciones: string | null
  created_at: string
  cliente: { id: number; nombre: string; nit: string | null } | null
  usuario: { id: number; nombres: string; apellidos: string } | null
  detalles: VentaDetalle[]
}

export interface VentaEstadisticas {
  total_monto: number
  count: number
  completadas: number
  pendientes: number
  canceladas: number
  totales: {
    hoy: { ventas: number; total: number }
    semana: { ventas: number; total: number }
    mes: { ventas: number; total: number }
  }
}

export interface VentaFiltros {
  search?: string
  estado?: string
  metodo_pago?: string
  fecha_inicio?: string
  fecha_fin?: string
  sort?: 'fecha_desc' | 'fecha_asc' | 'total_desc' | 'total_asc'
  page?: number
  per_page?: number
}

export interface VentasResponse {
  success: boolean
  ventas: Paginado<Venta>
  estadisticas: VentaEstadisticas
}

// ── POS ──────────────────────────────────────────────────────────────────
export interface ResultadoBusqueda {
  id: number
  nombre: string
  precio: number
  tipo: 'producto' | 'servicio'
  sku?: string
  codigo?: string
  marca?: string | null
  stock?: number
  imagen?: string | null
  ubicacion?: string | null
  precio_regular?: number
  en_oferta?: boolean
  vendidos?: number
}

export interface ClienteBusqueda {
  id: number
  nombre: string
  nit: string | null
  email: string | null
  telefono: string | null
}

export interface VentaItemPayload {
  tipo: ItemTipo
  cantidad: number
  descripcion: string
  precio_unitario: number
  costo?: number | null
  descuento?: number
  producto_id?: number | null
  servicio_id?: number | null
  referencia?: string | null
}

export interface StoreVentaPayload {
  items: VentaItemPayload[]
  cliente_id?: number | null
  metodo_pago: MetodoPago
  observaciones?: string | null
  nombre_cliente_credito?: string | null
  sucursal_id?: number | null
}
