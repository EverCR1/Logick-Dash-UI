import type { Paginado } from './producto'

export type PedidoEstado = 'pendiente' | 'confirmado' | 'en_preparacion' | 'enviado' | 'entregado' | 'cancelado'

export interface PedidoDetalle {
  id: number
  pedido_id: number
  producto_id: number | null
  nombre_producto: string
  precio_unitario: number
  cantidad: number
  subtotal: number
}

export interface Pedido {
  id: number
  numero_pedido: string
  nombre: string
  telefono: string | null
  email: string | null
  cliente_id: number | null
  cuenta_id: number | null
  cupon_id: number | null
  descuento_cupon: number
  puntos_ganados: number
  departamento: string | null
  municipio: string | null
  direccion: string | null
  referencias: string | null
  tipo_entrega: string | null
  metodo_pago: string | null
  estado: PedidoEstado
  subtotal: number
  costo_envio: number
  total: number
  notas: string | null
  notas_internas: string | null
  comprobante_url?: string | null
  created_at: string
  cuenta: { id: number; nombre: string; apellido: string | null; email: string } | null
  detalles: PedidoDetalle[]
}

export type PedidoSort = 'fecha_desc' | 'fecha_asc' | 'total_desc' | 'total_asc'

export interface PedidoFiltros {
  search?: string
  estado?: string
  fecha_inicio?: string
  fecha_fin?: string
  sort?: PedidoSort
  page?: number
  per_page?: number
}

export interface PedidoCounts {
  total: number
  activos: number
  entregado: number
  cancelado: number
  pendiente: number
  confirmado: number
  en_preparacion: number
  enviado: number
}

export interface PedidosResponse {
  success: boolean
  pedidos: Paginado<Pedido>
  counts: PedidoCounts
}
