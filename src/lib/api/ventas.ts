import { apiClient } from './client'
import type { ClienteBusqueda, ParaRepetirResponse, ResultadoBusqueda, StoreVentaPayload, Venta, VentaFiltros, VentasResponse } from '@/types/venta'

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
  /**
   * Devuelve cuánto se había abonado ya si la venta era a crédito. Cancelar anula
   * el crédito pero no saca ese dinero de caja: si se devolvió, hay que
   * registrarlo aparte.
   */
  /**
   * Líneas de una venta listas para volver a registrarla, con los precios de hoy.
   * Funciona también sobre canceladas: rehacer una es uno de sus usos.
   */
  paraRepetir: async (id: number): Promise<ParaRepetirResponse> => {
    const { data } = await apiClient.get<ParaRepetirResponse>(`/ventas/${id}/para-repetir`)
    return data
  },
  /**
   * Única escritura sobre una venta emitida. No toca ítems, importes ni fechas,
   * así que ninguna cifra ya reportada cambia.
   */
  corregir: async (id: number, payload: { cliente_id: number | null; observaciones: string | null }): Promise<Venta> => {
    const { data } = await apiClient.patch<{ success: boolean; venta: Venta }>(`/ventas/${id}/corregir`, payload)
    return data.venta
  },
  cancelar: async (id: number): Promise<{ abonado: number }> => {
    const { data } = await apiClient.post<{ abonado_pendiente_de_devolver?: number }>(`/ventas/${id}/cancelar`)
    return { abonado: Number(data.abonado_pendiente_de_devolver ?? 0) }
  },
  buscarProductos: async (query: string, limit = 12): Promise<ResultadoBusqueda[]> => {
    const { data } = await apiClient.get<{ success: boolean; productos: ResultadoBusqueda[] }>('/ventas/buscar/productos', { params: { query, limit } })
    return data.productos
  },
  buscarServicios: async (query: string, limit = 12): Promise<ResultadoBusqueda[]> => {
    const { data } = await apiClient.get<{ success: boolean; servicios: ResultadoBusqueda[] }>('/ventas/buscar/servicios', { params: { query, limit } })
    return data.servicios
  },
  buscarClientes: async (query: string): Promise<ClienteBusqueda[]> => {
    const { data } = await apiClient.get<{ success: boolean; clientes: ClienteBusqueda[] }>('/ventas/buscar/clientes', { params: { query, limit: 10 } })
    return data.clientes
  },
}
