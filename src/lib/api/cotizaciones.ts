import { apiClient } from './client'
import type {
  Cotizacion,
  CotizacionEstado,
  CotizacionFiltros,
  CotizacionesResponse,
  ParaVentaResponse,
  StoreCotizacionPayload,
} from '@/types/cotizacion'

export const cotizacionesApi = {
  listar: async (filtros: CotizacionFiltros = {}): Promise<CotizacionesResponse> => {
    const { data } = await apiClient.get<CotizacionesResponse>('/cotizaciones', { params: filtros })
    return data
  },
  obtener: async (id: number): Promise<Cotizacion> => {
    const { data } = await apiClient.get<{ success: boolean; cotizacion: Cotizacion }>(`/cotizaciones/${id}`)
    return data.cotizacion
  },
  crear: async (payload: StoreCotizacionPayload): Promise<Cotizacion> => {
    const { data } = await apiClient.post<{ success: boolean; cotizacion: Cotizacion }>('/cotizaciones', payload)
    return data.cotizacion
  },
  actualizar: async (id: number, payload: Partial<StoreCotizacionPayload>): Promise<Cotizacion> => {
    const { data } = await apiClient.put<{ success: boolean; cotizacion: Cotizacion }>(`/cotizaciones/${id}`, payload)
    return data.cotizacion
  },
  eliminar: async (id: number): Promise<void> => {
    await apiClient.delete(`/cotizaciones/${id}`)
  },
  /** Líneas listas para el punto de venta, contrastadas contra el catálogo de hoy. */
  paraVenta: async (id: number): Promise<ParaVentaResponse> => {
    const { data } = await apiClient.get<ParaVentaResponse>(`/cotizaciones/${id}/para-venta`)
    return data
  },
  /** 'convertida' no se acepta aquí: a ese estado se llega registrando la venta. */
  cambiarEstado: async (id: number, estado: Exclude<CotizacionEstado, 'convertida'>): Promise<Cotizacion> => {
    const { data } = await apiClient.post<{ success: boolean; cotizacion: Cotizacion }>(`/cotizaciones/${id}/estado`, { estado })
    return data.cotizacion
  },
}
