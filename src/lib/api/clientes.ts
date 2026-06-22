import { apiClient } from './client'
import type { Cliente, ClienteDetalle, ClienteFiltros, ClientePayload, ClientesResponse } from '@/types/cliente'

export const clientesApi = {
  listar: async (filtros: ClienteFiltros = {}): Promise<ClientesResponse> => {
    const { data } = await apiClient.get<ClientesResponse>('/clientes', { params: filtros })
    return data
  },

  obtener: async (id: number): Promise<ClienteDetalle> => {
    const { data } = await apiClient.get<{ success: boolean } & ClienteDetalle>(`/clientes/${id}`)
    return { cliente: data.cliente, estadisticas: data.estadisticas }
  },

  crear: async (payload: ClientePayload): Promise<Cliente> => {
    const { data } = await apiClient.post<{ success: boolean; cliente: Cliente }>('/clientes', payload)
    return data.cliente
  },

  actualizar: async (id: number, payload: ClientePayload): Promise<Cliente> => {
    const { data } = await apiClient.put<{ success: boolean; cliente: Cliente }>(`/clientes/${id}`, payload)
    return data.cliente
  },

  eliminar: async (id: number): Promise<void> => {
    await apiClient.delete(`/clientes/${id}`)
  },

  cambiarEstado: async (id: number): Promise<void> => {
    await apiClient.post(`/clientes/${id}/change-status`)
  },
}
