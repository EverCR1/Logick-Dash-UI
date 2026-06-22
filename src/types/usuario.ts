import type { Paginado } from './producto'
import type { Usuario } from './auth'

export type { Usuario }

export interface UsuarioFiltros {
  search?: string
  estado?: string
  rol?: string
  page?: number
  per_page?: number
}

export interface UsuariosResponse {
  success: boolean
  users: Paginado<Usuario>
}

export interface UsuarioPayload {
  nombres: string
  apellidos: string
  email: string
  username: string
  password?: string
  rol: 'administrador' | 'vendedor' | 'analista'
  estado: 'activo' | 'inactivo'
  telefono: string | null
  direccion: string | null
  sucursal_id: number | null
}

// ── Detalle (GET /users/:id) ────────────────────────────────────────────────
export interface VentaReciente {
  id: number
  numero_venta: string
  total: number
  estado: 'completada' | 'pendiente' | 'cancelada'
  created_at: string
}

export interface UsuarioVentasResumen {
  total: number
  monto_total: number
  completadas: number
  pendientes: number
  recientes: VentaReciente[]
}

export type UsuarioConSucursal = Usuario & {
  sucursal?: { id: number; nombre: string } | null
  updated_at?: string | null
}

export interface UsuarioDetalle {
  user: UsuarioConSucursal
  ventas: UsuarioVentasResumen
}
