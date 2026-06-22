import type { Paginado } from './producto'

export interface ImagenCategoria {
  url: string
  url_thumb: string | null
  url_medium: string | null
}

export interface Categoria {
  id: number
  nombre: string
  descripcion: string | null
  parent_id: number | null
  parent: { id: number; nombre: string } | null
  estado: 'activo' | 'inactivo'
  imagen?: ImagenCategoria | null
}

// Nodo del árbol jerárquico (endpoint /categorias-tree)
export interface CategoriaArbol {
  id: number
  nombre: string
  descripcion: string | null
  parent_id: number | null
  estado: 'activo' | 'inactivo'
  imagen: ImagenCategoria | null
  children_recursive?: CategoriaArbol[]
}

export interface CategoriaFiltros {
  search?: string
  estado?: string
  page?: number
  per_page?: number
}

export interface CategoriasResponse {
  success: boolean
  categorias: Paginado<Categoria>
}

export interface CategoriaPayload {
  nombre: string
  descripcion: string | null
  parent_id: number | null
  estado: 'activo' | 'inactivo'
}
