import { apiClient } from './client'
import type { Categoria, CategoriaArbol, CategoriaFiltros, CategoriaPayload, CategoriasResponse, ImagenCategoria } from '@/types/categoria'

export const categoriasApi = {
  listar: async (filtros: CategoriaFiltros = {}): Promise<CategoriasResponse> => {
    const { data } = await apiClient.get<CategoriasResponse>('/categorias', { params: filtros })
    return data
  },
  arbol: async (): Promise<CategoriaArbol[]> => {
    const { data } = await apiClient.get<{ success: boolean; categorias: CategoriaArbol[] }>('/categorias-tree')
    return data.categorias
  },
  crear: async (payload: CategoriaPayload): Promise<Categoria> => {
    const { data } = await apiClient.post<{ success: boolean; categoria: Categoria }>('/categorias', payload)
    return data.categoria
  },
  actualizar: async (id: number, payload: CategoriaPayload): Promise<Categoria> => {
    const { data } = await apiClient.put<{ success: boolean; categoria: Categoria }>(`/categorias/${id}`, payload)
    return data.categoria
  },
  eliminar: async (id: number): Promise<void> => {
    await apiClient.delete(`/categorias/${id}`)
  },
  cambiarEstado: async (id: number, estado: 'activo' | 'inactivo'): Promise<void> => {
    await apiClient.post(`/categorias/${id}/change-status`, { estado })
  },
  // ── Imagen (única; reemplaza la anterior) ──────────────────────────────────
  subirImagen: async (id: number, file: File): Promise<ImagenCategoria> => {
    const fd = new FormData()
    fd.append('imagen', file)
    const { data } = await apiClient.post<{ success: boolean; imagen: ImagenCategoria }>(`/categorias/${id}/upload-image`, fd)
    return data.imagen
  },
  eliminarImagen: async (id: number): Promise<void> => {
    await apiClient.delete(`/categorias/${id}/imagen`)
  },
}
