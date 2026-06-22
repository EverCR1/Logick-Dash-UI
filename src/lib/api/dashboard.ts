import { apiClient } from './client'
import type { DashboardData } from '@/types/dashboard'

export type RangoSerie = '7d' | '30d' | '90d' | '1y'

export const dashboardApi = {
  resumen: async (): Promise<DashboardData> => {
    const { data } = await apiClient.get<{ success: boolean } & DashboardData>('/dashboard')
    return data
  },

  serieVentas: async (rango: RangoSerie): Promise<DashboardData['serie_ventas']> => {
    const { data } = await apiClient.get<{ success: boolean; serie_ventas: DashboardData['serie_ventas'] }>(
      '/dashboard/serie-ventas',
      { params: { rango } },
    )
    return data.serie_ventas
  },
}
