export type Rol = 'administrador' | 'vendedor' | 'analista'

export interface Usuario {
  id: number
  nombres: string
  apellidos: string
  nombre_completo: string
  email: string
  username: string
  rol: Rol
  estado: 'activo' | 'inactivo'
  telefono: string | null
  direccion?: string | null
  sucursal_id: number | null
  last_login_at: string | null
  created_at?: string | null
}

export interface PerfilPayload {
  nombres: string
  apellidos: string
  email: string
  username: string
  telefono: string | null
  direccion: string | null
}

export interface CambiarPasswordPayload {
  current_password: string
  new_password: string
  new_password_confirmation: string
}

export interface LoginPayload {
  email?: string
  username?: string
  password: string
}

export interface LoginResponse {
  success: boolean
  message: string
  user: Usuario
  access_token: string
  token_type: string
}
