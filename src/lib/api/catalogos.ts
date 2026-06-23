import { apiClient } from './client'
import type { Proveedor } from '@/types/producto'
import type { CategoriaArbol } from '@/types/categoria'

export interface CategoriaOpcion {
  id: number
  nombre: string
  nivel: number
}

export interface SucursalOpcion {
  id: number
  nombre: string
}

export const catalogosApi = {
  // Aplana el árbol de categorías en orden jerárquico: raíz → hijas, alfabético en cada nivel.
  // (Usamos /categorias-tree en vez de /categorias-flat porque el mapa { id: nombre } pierde
  //  el orden al serializar/parsear claves numéricas en JS.)
  categorias: async (): Promise<CategoriaOpcion[]> => {
    const { data } = await apiClient.get<{ success: boolean; categorias: CategoriaArbol[] }>('/categorias-tree')
    const out: CategoriaOpcion[] = []
    const recorrer = (nodos: CategoriaArbol[], nivel: number) => {
      nodos
        .filter((n) => n.estado === 'activo')
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
        .forEach((n) => {
          out.push({ id: n.id, nombre: n.nombre, nivel })
          if (n.children_recursive?.length) recorrer(n.children_recursive, nivel + 1)
        })
    }
    recorrer(data.categorias, 0)
    return out
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
