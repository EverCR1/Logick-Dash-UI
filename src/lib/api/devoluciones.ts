import { apiClient } from './client'
import type {
  Devolucion, DevolucionFiltros, DevolucionPayload, DevolucionesResponse, DevolvibleResponse,
} from '@/types/devolucion'

export const devolucionesApi = {
  listar: async (filtros: DevolucionFiltros = {}): Promise<DevolucionesResponse> => {
    const { data } = await apiClient.get<DevolucionesResponse>('/devoluciones', { params: filtros })
    return data
  },
  obtener: async (id: number): Promise<Devolucion> => {
    const { data } = await apiClient.get<{ success: boolean; devolucion: Devolucion }>(`/devoluciones/${id}`)
    return data.devolucion
  },
  /** Qué queda por devolver de una venta, ya descontadas las tandas anteriores. */
  devolvible: async (ventaId: number): Promise<DevolvibleResponse> => {
    const { data } = await apiClient.get<DevolvibleResponse>(`/devoluciones/venta/${ventaId}/devolvible`)
    return data
  },
  crear: async (payload: DevolucionPayload): Promise<Devolucion> => {
    const { data } = await apiClient.post<{ success: boolean; devolucion: Devolucion }>('/devoluciones', payload)
    return data.devolucion
  },
}
