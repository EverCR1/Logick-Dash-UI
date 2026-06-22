import type { Paginado } from './producto'

export interface Sucursal {
  id: number
  nombre: string
  direccion: string | null
  municipio: string | null
  departamento: string | null
  referencia: string | null
  horario: string | null
  telefono: string | null
  lat: number | null
  lng: number | null
  estado: 'activo' | 'inactivo'
}

export interface SucursalFiltros {
  search?: string
  estado?: string
  page?: number
  per_page?: number
}

export interface SucursalesResponse {
  success: boolean
  sucursales: Paginado<Sucursal>
}

export interface SucursalPayload {
  nombre: string
  direccion: string | null
  municipio: string | null
  departamento: string | null
  referencia: string | null
  horario: string | null
  telefono: string | null
  estado: 'activo' | 'inactivo'
}

// ── Detalle (GET /sucursales/:id) ───────────────────────────────────────────
export interface SucursalUsuario {
  id: number
  sucursal_id: number
  nombres: string
  apellidos: string
  rol: string
  estado: string
}

export interface SucursalDetalle {
  sucursal: Sucursal & {
    created_at?: string | null
    ventas_count: number
    usuarios: SucursalUsuario[]
  }
}
