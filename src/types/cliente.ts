import type { Paginado } from './producto'

export interface Cliente {
  id: number
  nombre: string
  nit: string | null
  email: string | null
  telefono: string | null
  direccion: string | null
  tipo: 'natural' | 'juridico'
  estado: 'activo' | 'inactivo'
  notas: string | null
  /** Saldo a favor: dinero suyo que está en la caja del negocio. */
  saldo_favor?: number | null
}

export type ClienteSort =
  | 'nombre_asc' | 'nombre_desc'
  | 'recientes' | 'antiguos'
  | 'compras_desc' | 'monto_desc'
  | 'saldo_desc'

export interface ClienteFiltros {
  search?: string
  estado?: string
  tipo?: string
  /** Solo los que hoy tienen dinero a su favor. */
  con_saldo?: boolean
  sort?: ClienteSort
  page?: number
  per_page?: number
}

export interface ClienteCounts {
  activos: number
  inactivos: number
  naturales: number
  juridicos: number
  clientes_con_saldo: number
  /** Pasivo del negocio: lo que se le debe al conjunto de clientes. */
  saldo_favor_total: number
}

export interface ClientesResponse {
  success: boolean
  clientes: Paginado<Cliente>
  counts: ClienteCounts
}

export interface ClientePayload {
  nombre: string
  nit: string | null
  email: string | null
  telefono: string | null
  direccion: string | null
  tipo: 'natural' | 'juridico'
  estado: 'activo' | 'inactivo'
  notas: string | null
}

// ── Detalle (GET /clientes/:id) ─────────────────────────────────────────────
export interface ClienteVenta {
  id: number
  numero_venta: string
  total: number
  estado: 'completada' | 'pendiente' | 'cancelada'
  created_at: string
}

export interface ClienteEstadisticas {
  total_ventas: number
  total_gastado: number
  ultima_compra: ClienteVenta | null
  ventas_mes_actual: number
  total_mes_actual: number
}

export interface ClienteDetalle {
  cliente: Cliente & { created_at?: string | null; ventas?: ClienteVenta[] }
  estadisticas: ClienteEstadisticas
}
