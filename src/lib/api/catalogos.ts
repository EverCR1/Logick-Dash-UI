import { apiClient } from './client'
import type { Proveedor } from '@/types/producto'

export interface CategoriaOpcion {
  id: number
  nombre: string
}

export interface SucursalOpcion {
  id: number
  nombre: string
}

export const catalogosApi = {
  // categorias-flat devuelve un mapa { id: "nombre con prefijo" }
  categorias: async (): Promise<CategoriaOpcion[]> => {
    const { data } = await apiClient.get<{ success: boolean; categorias: Record<string, string> }>('/categorias-flat')
    return Object.entries(data.categorias).map(([id, nombre]) => ({ id: Number(id), nombre }))
  },

  proveedoresActivos: async (): Promise<Proveedor[]> => {
    const { data } = await apiClient.get<{ success: boolean; proveedores: Proveedor[] }>('/proveedores/activos')
    return data.proveedores
  },

  sucursalesActivas: async (): Promise<SucursalOpcion[]> => {
    const { data } = await apiClient.get<{ success: boolean; sucursales: SucursalOpcion[] }>('/sucursales/activas')
    return data.sucursales
  },
}
