import { apiClient } from './client'
import type { NotificacionesResponse, NotificacionEstado } from '@/types/notificacion'

export const notificacionesApi = {
  listar: async (): Promise<NotificacionesResponse> => {
    const { data } = await apiClient.get<NotificacionesResponse>('/notificaciones')
    return data
  },
  marcarLeidas: async (): Promise<void> => {
    await apiClient.post('/notificaciones/marcar-leidas')
  },
  cambiarEstado: async (id: number, estado: NotificacionEstado): Promise<void> => {
    await apiClient.patch(`/notificaciones/${id}/estado`, { estado })
  },
}
