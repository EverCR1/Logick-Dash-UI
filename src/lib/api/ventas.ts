import { apiClient } from './client'
import type { ClienteBusqueda, ResultadoBusqueda, StoreVentaPayload, Venta, VentaFiltros, VentasResponse } from '@/types/venta'

export const ventasApi = {
  listar: async (filtros: VentaFiltros = {}): Promise<VentasResponse> => {
    const { data } = await apiClient.get<VentasResponse>('/ventas', { params: filtros })
    return data
  },
  obtener: async (id: number): Promise<Venta> => {
    const { data } = await apiClient.get<{ success: boolean; venta: Venta }>(`/ventas/${id}`)
    return data.venta
  },
  crear: async (payload: StoreVentaPayload): Promise<Venta> => {
    const { data } = await apiClient.post<{ success: boolean; venta: Venta }>('/ventas', payload)
    return data.venta
  },
  cancelar: async (id: number): Promise<void> => {
    await apiClient.post(`/ventas/${id}/cancelar`)
  },
  buscarProductos: async (query: string): Promise<ResultadoBusqueda[]> => {
    const { data } = await apiClient.get<{ success: boolean; productos: ResultadoBusqueda[] }>('/ventas/buscar/productos', { params: { query, limit: 12 } })
    return data.productos
  },
  buscarServicios: async (query: string): Promise<ResultadoBusqueda[]> => {
    const { data } = await apiClient.get<{ success: boolean; servicios: ResultadoBusqueda[] }>('/ventas/buscar/servicios', { params: { query, limit: 12 } })
    return data.servicios
  },
  buscarClientes: async (query: string): Promise<ClienteBusqueda[]> => {
    const { data } = await apiClient.get<{ success: boolean; clientes: ClienteBusqueda[] }>('/ventas/buscar/clientes', { params: { query, limit: 10 } })
    return data.clientes
  },
}
