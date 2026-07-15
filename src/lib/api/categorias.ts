import { apiClient } from './client'
import type { Categoria, CategoriaArbol, CategoriaFiltros, CategoriaPayload, CategoriasResponse, ImagenCategoria } from '@/types/categoria'

export const categoriasApi = {
  listar: async (filtros: CategoriaFiltros = {}): Promise<CategoriasResponse> => {
    const { data } = await apiClient.get<CategoriasResponse>('/categorias', { params: filtros })
    return data
  },
  // El backend no ordena el árbol; se ordena aquí alfabéticamente en cada nivel
  // (raíz y cada grupo de subcategorías), de forma recursiva.
  arbol: async (): Promise<CategoriaArbol[]> => {
    const { data } = await apiClient.get<{ success: boolean; categorias: CategoriaArbol[] }>('/categorias-tree')
    const ordenar = (nodos: CategoriaArbol[]): CategoriaArbol[] =>
      [...nodos]
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
        .map((n) => ({ ...n, children_recursive: n.children_recursive ? ordenar(n.children_recursive) : n.children_recursive }))
    return ordenar(data.categorias)
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
