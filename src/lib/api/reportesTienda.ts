import { apiClient } from './client'
import type { ReporteFiltros, ReporteProblema, ReportesResponse, ReporteUpdatePayload } from '@/types/reporte-problema'

export const reportesTiendaApi = {
  listar: async (filtros: ReporteFiltros = {}): Promise<ReportesResponse> => {
    const { data } = await apiClient.get<ReportesResponse>('/admin/reportes', { params: filtros })
    return data
  },
  obtener: async (id: number): Promise<ReporteProblema> => {
    const { data } = await apiClient.get<{ success: boolean; reporte: ReporteProblema }>(`/admin/reportes/${id}`)
    return data.reporte
  },
  actualizar: async (id: number, payload: ReporteUpdatePayload): Promise<void> => {
    await apiClient.patch(`/admin/reportes/${id}`, payload)
  },
}
