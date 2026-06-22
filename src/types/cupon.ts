import type { Paginado } from './producto'

export interface Cupon {
  id: number
  codigo: string
  descripcion: string | null
  tipo: 'porcentaje' | 'monto_fijo'
  valor: number
  minimo_compra: number | null
  maximo_descuento: number | null
  usos_maximos: number | null
  usos_actuales: number
  usos_por_cuenta: number
  solo_primera_compra: boolean
  es_publico: boolean
  fecha_inicio: string | null
  fecha_vencimiento: string | null
  estado: 'activo' | 'inactivo'
  mensaje_error: string | null
}

export interface CuponFiltros {
  search?: string
  estado?: string
  page?: number
  per_page?: number
}

export interface CuponesResponse {
  success: boolean
  cupones: Paginado<Cupon>
  counts: { total: number; activos: number; inactivos: number }
}

export interface CuponPayload {
  codigo: string
  descripcion: string | null
  tipo: 'porcentaje' | 'monto_fijo'
  valor: number
  minimo_compra: number | null
  maximo_descuento: number | null
  usos_maximos: number | null
  usos_por_cuenta: number
  solo_primera_compra: boolean
  es_publico: boolean
  fecha_inicio: string | null
  fecha_vencimiento: string | null
  estado: 'activo' | 'inactivo'
  mensaje_error: string | null
}
