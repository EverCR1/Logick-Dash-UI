import { apiClient } from './client'
import type { Credito, CreditoFiltros, CreditoPayload, CreditosResponse, RegistrarPagoPayload } from '@/types/credito'

export const creditosApi = {
  listar: async (filtros: CreditoFiltros = {}): Promise<CreditosResponse> => {
    const { data } = await apiClient.get<CreditosResponse>('/creditos', { params: filtros })
    return data
  },
  obtener: async (id: number): Promise<Credito> => {
    const { data } = await apiClient.get<{ success: boolean; credito: Credito }>(`/creditos/${id}`)
    return data.credito
  },
  crear: async (payload: CreditoPayload): Promise<Credito> => {
    const { data } = await apiClient.post<{ success: boolean; credito: Credito }>('/creditos', payload)
    return data.credito
  },
  actualizar: async (id: number, payload: Omit<CreditoPayload, 'capital_restante'>): Promise<Credito> => {
    const { data } = await apiClient.put<{ success: boolean; credito: Credito }>(`/creditos/${id}`, payload)
    return data.credito
  },
  // Un crédito no se elimina: se condona si no se va a cobrar, o se anula si no
  // debió existir. Borrarlo arrastraba sus abonos y con ellos el ingreso ya
  // reconocido de meses cerrados.
  condonar: async (id: number, motivo: string): Promise<Credito> => {
    const { data } = await apiClient.post<{ success: boolean; credito: Credito }>(`/creditos/${id}/condonar`, { motivo })
    return data.credito
  },
  /**
   * Deshace un abono anotando su salida con la fecha de hoy. El abono original
   * queda intacto: borrarlo cambiaría el ingreso ya reportado de su mes.
   */
  revertirPago: async (creditoId: number, pagoId: number, motivo: string): Promise<Credito> => {
    const { data } = await apiClient.post<{ success: boolean; credito: Credito }>(
      `/creditos/${creditoId}/pagos/${pagoId}/revertir`, { motivo })
    return data.credito
  },
  anular: async (id: number, motivo: string): Promise<Credito> => {
    const { data } = await apiClient.post<{ success: boolean; credito: Credito }>(`/creditos/${id}/anular`, { motivo })
    return data.credito
  },
  registrarPago: async (id: number, payload: RegistrarPagoPayload): Promise<Credito> => {
    const { data } = await apiClient.post<{ success: boolean; credito: Credito }>(`/creditos/${id}/registrar-pago`, payload)
    return data.credito
  },
}
