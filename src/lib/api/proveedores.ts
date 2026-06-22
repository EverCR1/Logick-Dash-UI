import { apiClient } from './client'
import type { Proveedor, ProveedorDetalle, ProveedorFiltros, ProveedorPayload, ProveedoresResponse } from '@/types/proveedor'

export const proveedoresApi = {
  listar: async (filtros: ProveedorFiltros = {}): Promise<ProveedoresResponse> => {
    const { data } = await apiClient.get<ProveedoresResponse>('/proveedores', { params: filtros })
    return data
  },
  obtener: async (id: number): Promise<ProveedorDetalle> => {
    const { data } = await apiClient.get<{ success: boolean } & ProveedorDetalle>(`/proveedores/${id}`)
    return { proveedor: data.proveedor }
  },
  crear: async (payload: ProveedorPayload): Promise<Proveedor> => {
    const { data } = await apiClient.post<{ success: boolean; proveedor: Proveedor }>('/proveedores', payload)
    return data.proveedor
  },
  actualizar: async (id: number, payload: ProveedorPayload): Promise<Proveedor> => {
    const { data } = await apiClient.put<{ success: boolean; proveedor: Proveedor }>(`/proveedores/${id}`, payload)
    return data.proveedor
  },
  eliminar: async (id: number): Promise<void> => {
    await apiClient.delete(`/proveedores/${id}`)
  },
  cambiarEstado: async (id: number, estado: 'activo' | 'inactivo'): Promise<void> => {
    await apiClient.post(`/proveedores/${id}/change-status`, { estado })
  },
}
