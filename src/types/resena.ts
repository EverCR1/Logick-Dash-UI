import type { Paginado } from './producto'

export type ResenaEstado = 'pendiente' | 'publicado' | 'rechazado'

export interface Resena {
  id: number
  cuenta_id: number | null
  producto_id: number
  pedido_id: number | null
  rating: number
  comentario: string | null
  puntos_otorgados: number
  estado: ResenaEstado
  created_at: string
  cuenta: { id: number; nombre: string; apellido: string | null; email: string } | null
  producto: { id: number; nombre: string; precio_venta: number } | null
}

export interface ResenaFiltros {
  estado?: string
  page?: number
  per_page?: number
}

export interface ResenaCounts {
  total: number
  pendiente: number
  publicado: number
  rechazado: number
}

export interface ResenasResponse {
  success: boolean
  resenas: Paginado<Resena>
  counts: ResenaCounts
}
