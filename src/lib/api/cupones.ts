import { apiClient } from './client'
import type { Cupon, CuponFiltros, CuponPayload, CuponesResponse } from '@/types/cupon'

const BASE = '/admin/cupones'

export const cuponesApi = {
  listar: async (filtros: CuponFiltros = {}): Promise<CuponesResponse> => {
    const { data } = await apiClient.get<CuponesResponse>(BASE, { params: filtros })
    return data
  },
  crear: async (payload: CuponPayload): Promise<Cupon> => {
    const { data } = await apiClient.post<{ success: boolean; cupon: Cupon }>(BASE, payload)
    return data.cupon
  },
  actualizar: async (id: number, payload: CuponPayload): Promise<Cupon> => {
    const { data } = await apiClient.put<{ success: boolean; cupon: Cupon }>(`${BASE}/${id}`, payload)
    return data.cupon
  },
  eliminar: async (id: number): Promise<void> => {
    await apiClient.delete(`${BASE}/${id}`)
  },
  toggleEstado: async (id: number): Promise<void> => {
    await apiClient.patch(`${BASE}/${id}/estado`)
  },
}
