import type { Paginado } from './producto'

export interface Proveedor {
  id: number
  nombre: string
  email: string | null
  telefono: string | null
  direccion: string | null
  descripcion: string | null
  estado: 'activo' | 'inactivo'
}

export interface ProveedorFiltros {
  search?: string
  estado?: string
  page?: number
  per_page?: number
}

export interface ProveedoresResponse {
  success: boolean
  proveedores: Paginado<Proveedor>
  counts: { activos: number; inactivos: number }
}

export interface ProveedorPayload {
  nombre: string
  email: string | null
  telefono: string | null
  direccion: string | null
  descripcion: string | null
  estado: 'activo' | 'inactivo'
}

// ── Detalle (GET /proveedores/:id) ──────────────────────────────────────────
export interface ProveedorProducto {
  id: number
  sku: string
  nombre: string
  marca: string | null
  precio_venta: number
  stock: number
  stock_minimo: number
  estado: 'activo' | 'inactivo'
}

export interface ProveedorDetalle {
  proveedor: Proveedor & {
    created_at?: string | null
    productos_count: number
    productos_activos_count: number
    dias_como_proveedor: number
    productos: ProveedorProducto[]
  }
}
