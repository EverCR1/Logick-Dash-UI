import { apiClient } from './client'
import type { Servicio, ServicioFiltros, ServicioImagen, ServicioPayload, ServiciosResponse } from '@/types/servicio'

export const serviciosApi = {
  listar: async (filtros: ServicioFiltros = {}): Promise<ServiciosResponse> => {
    const { data } = await apiClient.get<ServiciosResponse>('/servicios', { params: filtros })
    return data
  },
  obtener: async (id: number): Promise<Servicio> => {
    const { data } = await apiClient.get<{ success: boolean; servicio: Servicio }>(`/servicios/${id}`)
    return data.servicio
  },

  crear: async (payload: ServicioPayload): Promise<Servicio> => {
    const { data } = await apiClient.post<{ success: boolean; servicio: Servicio }>('/servicios', payload)
    return data.servicio
  },
  actualizar: async (id: number, payload: ServicioPayload): Promise<Servicio> => {
    const { data } = await apiClient.put<{ success: boolean; servicio: Servicio }>(`/servicios/${id}`, payload)
    return data.servicio
  },
  eliminar: async (id: number): Promise<void> => {
    await apiClient.delete(`/servicios/${id}`)
  },
  cambiarEstado: async (id: number, estado: 'activo' | 'inactivo'): Promise<void> => {
    await apiClient.post(`/servicios/${id}/change-status`, { estado })
  },

  // ── Imagen (única; reemplaza la anterior) ──────────────────────────────────
  subirImagen: async (id: number, file: File): Promise<ServicioImagen> => {
    const fd = new FormData()
    fd.append('imagen', file)
    const { data } = await apiClient.post<{ success: boolean; imagen: ServicioImagen }>(`/servicios/${id}/upload-image`, fd)
    return data.imagen
  },
  eliminarImagen: async (id: number, imagenId: number): Promise<void> => {
    await apiClient.delete(`/servicios/${id}/images/${imagenId}`)
  },
}
