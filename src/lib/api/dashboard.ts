import { apiClient } from './client'
import type { DashboardData } from '@/types/dashboard'

export type RangoSerie = '7d' | '30d' | '90d' | '1y'

export const dashboardApi = {
  resumen: async (): Promise<DashboardData> => {
    const { data } = await apiClient.get<{ success: boolean } & DashboardData>('/dashboard')
    return data
  },

  // Devuelve la serie del gráfico y la rentabilidad del MISMO rango: el selector
  // mueve ambos a la vez porque el usuario los ve juntos en pantalla.
  serieVentas: async (rango: RangoSerie): Promise<{
    serie_ventas: DashboardData['serie_ventas']
    rentabilidad: DashboardData['rentabilidad']
  }> => {
    const { data } = await apiClient.get<{
      success: boolean
      serie_ventas: DashboardData['serie_ventas']
      rentabilidad: DashboardData['rentabilidad']
    }>('/dashboard/serie-ventas', { params: { rango } })
    return { serie_ventas: data.serie_ventas, rentabilidad: data.rentabilidad }
  },
}
