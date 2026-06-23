import { apiClient } from './client'
import type { ImagenProducto, Producto, ProductoAtributo, ProductoFiltros, ProductosResponse } from '@/types/producto'

export interface ProductoPayload {
  sku: string
  nombre: string
  descripcion: string | null
  especificaciones: string | null
  marca: string | null
  color: string | null
  proveedor_id: number
  precio_compra: number
  precio_venta: number
  precio_oferta: number | null
  estado: 'activo' | 'inactivo'
  stock: number
  stock_minimo: number
  codigo_barras: string | null
  ubicacion: string | null
  garantia: string | null
  notas_internas: string | null
  grupo_variante: string | null
  categorias: number[]
  atributos?: ProductoAtributo[]
}

export const productosApi = {
  listar: async (filtros: ProductoFiltros = {}): Promise<ProductosResponse> => {
    const { data } = await apiClient.get<ProductosResponse>('/productos', { params: filtros })
    return data
  },

  obtener: async (id: number): Promise<Producto> => {
    const { data } = await apiClient.get<{ success: boolean; producto: Producto }>(`/productos/${id}`)
    return data.producto
  },

  crear: async (payload: ProductoPayload): Promise<Producto> => {
    const { data } = await apiClient.post<{ success: boolean; producto: Producto }>('/productos', payload)
    return data.producto
  },

  actualizar: async (id: number, payload: ProductoPayload): Promise<Producto> => {
    const { data } = await apiClient.put<{ success: boolean; producto: Producto }>(`/productos/${id}`, payload)
    return data.producto
  },

  eliminar: async (id: number): Promise<void> => {
    await apiClient.delete(`/productos/${id}`)
  },

  cambiarEstado: async (id: number, estado: 'activo' | 'inactivo'): Promise<void> => {
    await apiClient.post(`/productos/${id}/change-status`, { estado })
  },

  // Ajuste rápido de stock: actualización parcial (solo el campo stock)
  ajustarStock: async (id: number, stock: number): Promise<Producto> => {
    const { data } = await apiClient.put<{ success: boolean; producto: Producto }>(`/productos/${id}`, { stock })
    return data.producto
  },

  // Vincular/desvincular del grupo de variantes (asigna o limpia grupo_variante)
  vincularGrupo: async (id: number, grupo: string | null): Promise<Producto> => {
    const { data } = await apiClient.put<{ success: boolean; producto: Producto }>(`/productos/${id}`, { grupo_variante: grupo ?? '' })
    return data.producto
  },

  // ── Imágenes ──────────────────────────────────────────────────────────────
  subirImagenes: async (id: number, files: File[]): Promise<ImagenProducto[]> => {
    const fd = new FormData()
    files.forEach((f) => fd.append('imagenes[]', f))
    const { data } = await apiClient.post<{ success: boolean; imagenes: ImagenProducto[] }>(`/productos/${id}/upload-images`, fd)
    return data.imagenes
  },
  imagenPrincipal: async (id: number, imagenId: number): Promise<void> => {
    await apiClient.post(`/productos/${id}/images/${imagenId}/set-main`)
  },
  eliminarImagen: async (id: number, imagenId: number): Promise<void> => {
    await apiClient.delete(`/productos/${id}/images/${imagenId}`)
  },
}
