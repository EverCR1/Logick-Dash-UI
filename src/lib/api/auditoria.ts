import { apiClient } from './client'
import type { Auditoria, AuditoriaFiltros, AuditoriaResponse } from '@/types/auditoria'

export const auditoriaApi = {
  listar: async (filtros: AuditoriaFiltros = {}): Promise<AuditoriaResponse> => {
    const { data } = await apiClient.get<AuditoriaResponse>('/auditoria', { params: filtros })
    return data
  },
  obtener: async (id: number): Promise<Auditoria> => {
    const { data } = await apiClient.get<{ success: boolean; auditoria: Auditoria }>(`/auditoria/${id}`)
    return data.auditoria
  },
  modulos: async (): Promise<string[]> => {
    const { data } = await apiClient.get<{ success: boolean; modulos: string[] }>('/auditoria/modulos')
    return data.modulos
  },
}
