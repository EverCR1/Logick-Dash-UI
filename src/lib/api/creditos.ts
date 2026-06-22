import { apiClient } from './client'
import type { Credito, CreditoFiltros, CreditoPayload, CreditosResponse, RegistrarPagoPayload } from '@/types/credito'

export const creditosApi = {
  listar: async (filtros: CreditoFiltros = {}): Promise<CreditosResponse> => {
    const { data } = await apiClient.get<CreditosResponse>('/creditos', { params: filtros })
    return data
  },
  crear: async (payload: CreditoPayload): Promise<Credito> => {
    const { data } = await apiClient.post<{ success: boolean; credito: Credito }>('/creditos', payload)
    return data.credito
  },
  actualizar: async (id: number, payload: Omit<CreditoPayload, 'capital_restante'>): Promise<Credito> => {
    const { data } = await apiClient.put<{ success: boolean; credito: Credito }>(`/creditos/${id}`, payload)
    return data.credito
  },
  eliminar: async (id: number): Promise<void> => {
    await apiClient.delete(`/creditos/${id}`)
  },
  registrarPago: async (id: number, payload: RegistrarPagoPayload): Promise<Credito> => {
    const { data } = await apiClient.post<{ success: boolean; credito: Credito }>(`/creditos/${id}/registrar-pago`, payload)
    return data.credito
  },
}
