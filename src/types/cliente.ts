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
}

export interface ClienteFiltros {
  search?: string
  estado?: string
  tipo?: string
  page?: number
  per_page?: number
}

export interface ClienteCounts {
  activos: number
  inactivos: number
  naturales: number
  juridicos: number
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
