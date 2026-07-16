export type NotificacionNivel = 'info' | 'warning' | 'danger'
export type NotificacionEstado = 'pendiente' | 'aplicado' | 'descartado'

export interface Notificacion {
  id: number
  tipo: string
  titulo: string
  mensaje: string | null
  nivel: NotificacionNivel
  ruta: string | null
  estado: NotificacionEstado
  referencia_tipo: string | null
  referencia_id: number | null
  created_at: string
  leida: boolean
}

export interface NotificacionesResponse {
  success: boolean
  notificaciones: Notificacion[]
  no_leidas: number
}
