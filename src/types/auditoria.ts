import type { OpcionCatalogo, Paginado } from './producto'

export type AuditoriaAccion = 'CREAR' | 'EDITAR' | 'ELIMINAR' | 'CAMBIO_ESTADO' | string

export interface Auditoria {
  id: number
  usuario_id: number | null
  usuario_nombre: string | null
  usuario_rol: string | null
  accion: AuditoriaAccion
  modulo: string
  tabla: string | null
  registro_id: number | null
  descripcion: string | null
  valores_anteriores: Record<string, unknown> | null
  valores_nuevos: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
  usuario: { id: number; name: string } | null
}

export interface AuditoriaFiltros {
  modulo?: string
  accion?: string
  usuario_id?: string | number
  fecha_inicio?: string
  fecha_fin?: string
  busqueda?: string
  page?: number
  per_page?: number
}

/** Usuarios presentes en el log, para el select de filtro. */
export interface AuditoriaCatalogos {
  usuarios: OpcionCatalogo[]
}

export interface AuditoriaResponse {
  success: boolean
  auditoria: Paginado<Auditoria>
  catalogos: AuditoriaCatalogos
}
