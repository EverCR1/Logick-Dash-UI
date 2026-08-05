export interface ImagenProducto {
  id: number
  url: string
  url_thumb: string | null
  url_medium: string | null
  es_principal: boolean
  orden: number
}

export interface ProductoCategoria {
  id: number
  nombre: string
}

export interface Proveedor {
  id: number
  nombre: string
  estado: string
}

export interface Producto {
  id: number
  sku: string
  nombre: string
  nombre_completo: string
  descripcion: string | null
  especificaciones: string | null
  marca: string | null
  color: string | null
  proveedor_id: number | null
  proveedor: Proveedor | null
  precio_compra: number
  precio_venta: number
  precio_oferta: number | null
  estado: 'activo' | 'inactivo'
  stock: number
  stock_minimo: number
  codigo_barras: string | null
  ubicacion: string | null
  garantia: string | null
  categorias: ProductoCategoria[]
  imagenes: ImagenProducto[]
  notas_internas?: string | null
  grupo_variante?: string | null
  atributos?: ProductoAtributo[]
  created_at?: string | null
  updated_at?: string | null
}

export interface ProductoAtributo {
  id?: number
  nombre: string
  valor: string
}

export interface ProductoFiltros {
  search?: string
  estado?: string
  categoria_id?: number
  proveedor_id?: number
  stock?: string
  sort?: string
  grupo_variante?: string
  page?: number
  per_page?: number
}

export interface ProductoCounts {
  total: number
  activos: number
  inactivos: number
  stock_bajo: number
  agotados: number
  en_oferta: number
}

// Estructura del paginador de Laravel
export interface Paginado<T> {
  data: T[]
  current_page: number
  last_page: number
  per_page: number
  total: number
  from: number | null
  to: number | null
}

export interface ProductosResponse {
  success: boolean
  productos: Paginado<Producto>
  counts: ProductoCounts
}
