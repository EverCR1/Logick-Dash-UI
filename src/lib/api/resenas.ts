import { apiClient } from './client'
import type { ResenaEstado, ResenasResponse } from '@/types/resena'

export const resenasApi = {
  listar: async (filtros: { estado?: string; page?: number; per_page?: number } = {}): Promise<ResenasResponse> => {
    const { data } = await apiClient.get<ResenasResponse>('/admin/resenas', { params: filtros })
    return data
  },
  cambiarEstado: async (id: number, estado: ResenaEstado): Promise<void> => {
    await apiClient.patch(`/admin/resenas/${id}/estado`, { estado })
  },
}
