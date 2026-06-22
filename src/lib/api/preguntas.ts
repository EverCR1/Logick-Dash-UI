import { apiClient } from './client'
import type { PreguntasResponse, PreguntaUpdatePayload } from '@/types/pregunta'

export const preguntasApi = {
  listar: async (filtros: { estado?: string; page?: number; per_page?: number } = {}): Promise<PreguntasResponse> => {
    const { data } = await apiClient.get<PreguntasResponse>('/admin/preguntas', { params: filtros })
    return data
  },
  actualizar: async (id: number, payload: PreguntaUpdatePayload): Promise<void> => {
    await apiClient.patch(`/admin/preguntas/${id}`, payload)
  },
}
