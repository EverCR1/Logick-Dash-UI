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

/** Lo que comparten todas las variantes del grupo. */
export interface GrupoBasePayload {
  nombre: string
  descripcion: string | null
  especificaciones: string | null
  marca: string | null
  garantia: string | null
  ubicacion: string | null
  notas_internas: string | null
  proveedor_id: number
  estado: 'activo' | 'inactivo'
  categorias: number[]
}

/** Lo que distingue a cada variante dentro del grupo. */
export interface VariantePayload {
  sku: string
  codigo_barras: string | null
  color: string | null
  precio_compra: number
  precio_venta: number
  precio_oferta: number | null
  stock: number
  stock_minimo: number
  atributos: ProductoAtributo[]
}

export interface GrupoProductosPayload {
  base: GrupoBasePayload
  variantes: VariantePayload[]
  /** Grupo existente al que sumarlas; omitido, el backend crea uno nuevo. */
  grupo_variante?: string | null
}

export interface GrupoCreado {
  productos: Producto[]
  grupo_variante: string
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

  /**
   * Crea todas las variantes de un producto en una sola operación transaccional.
   * O se crean todas o no se crea ninguna, así un SKU repetido a mitad del lote
   * no deja un grupo a medias.
   */
  crearGrupo: async (payload: GrupoProductosPayload): Promise<GrupoCreado> => {
    const { data } = await apiClient.post<{ success: boolean } & GrupoCreado>('/productos/grupo', payload)
    return { productos: data.productos, grupo_variante: data.grupo_variante }
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

  /**
   * Replica las imágenes de un producto en otros sin volver a subirlas: las
   * filas apuntan al mismo archivo de ImgBB.
   */
  copiarImagenes: async (id: number, destinos: number[]): Promise<void> => {
    await apiClient.post(`/productos/${id}/copiar-imagenes`, { destinos })
  },
  eliminarImagen: async (id: number, imagenId: number): Promise<void> => {
    await apiClient.delete(`/productos/${id}/images/${imagenId}`)
  },
}
