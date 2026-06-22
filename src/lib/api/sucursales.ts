import { apiClient } from './client'
import type { Sucursal, SucursalDetalle, SucursalFiltros, SucursalPayload, SucursalesResponse } from '@/types/sucursal'

export const sucursalesApi = {
  listar: async (filtros: SucursalFiltros = {}): Promise<SucursalesResponse> => {
    const { data } = await apiClient.get<SucursalesResponse>('/sucursales', { params: filtros })
    return data
  },
  obtener: async (id: number): Promise<SucursalDetalle> => {
    const { data } = await apiClient.get<{ success: boolean } & SucursalDetalle>(`/sucursales/${id}`)
    return { sucursal: data.sucursal }
  },
  crear: async (payload: SucursalPayload): Promise<Sucursal> => {
    const { data } = await apiClient.post<{ success: boolean; sucursal: Sucursal }>('/sucursales', payload)
    return data.sucursal
  },
  actualizar: async (id: number, payload: SucursalPayload): Promise<Sucursal> => {
    const { data } = await apiClient.put<{ success: boolean; sucursal: Sucursal }>(`/sucursales/${id}`, payload)
    return data.sucursal
  },
  eliminar: async (id: number): Promise<void> => {
    await apiClient.delete(`/sucursales/${id}`)
  },
  cambiarEstado: async (id: number, estado: 'activo' | 'inactivo'): Promise<void> => {
    await apiClient.post(`/sucursales/${id}/change-status`, { estado })
  },
}
