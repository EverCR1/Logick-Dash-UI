import type { Paginado } from './producto'

export interface ServicioImagen {
  id: number
  url: string
  url_thumb: string | null
  url_medium: string | null
}

export interface Servicio {
  id: number
  codigo: string
  nombre: string
  descripcion: string | null
  inversion_estimada: number
  precio_venta: number
  precio_oferta: number | null
  estado: 'activo' | 'inactivo'
  notas_internas: string | null
  imagenes?: ServicioImagen[]
  created_at?: string | null
  updated_at?: string | null
}

export type ServicioSort =
  | 'nombre_asc' | 'nombre_desc'
  | 'precio_asc' | 'precio_desc'
  | 'inversion_asc' | 'inversion_desc'
  | 'margen_asc' | 'margen_desc'

/** Tramos de margen que reconoce la API: alto ≥100%, medio 50-99%, bajo 20-49%, mínimo <20% */
export type ServicioMargen = 'todos' | 'alto' | 'medio' | 'bajo' | 'minimo'

export interface ServicioFiltros {
  search?: string
  estado?: string
  precio_min?: number
  precio_max?: number
  margen?: ServicioMargen
  sort?: ServicioSort
  page?: number
  per_page?: number
}

export interface ServiciosResponse {
  success: boolean
  servicios: Paginado<Servicio>
  counts: { total: number; activos: number; inactivos: number; en_oferta: number; margen_alto: number }
}

export interface ServicioPayload {
  codigo: string
  nombre: string
  descripcion: string | null
  inversion_estimada: number
  precio_venta: number
  precio_oferta: number | null
  estado: 'activo' | 'inactivo'
  notas_internas: string | null
}
