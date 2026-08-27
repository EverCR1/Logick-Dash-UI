import type { Paginado } from './producto'
import type { ClienteBusqueda } from './venta'

/** Estados guardados. "vencida" no es uno: se deriva de valido_hasta. */
export type CotizacionEstado = 'borrador' | 'enviada' | 'aceptada' | 'rechazada' | 'convertida'

/** Solo dos: una línea escrita a mano sigue siendo un producto o un servicio. */
export type CotizacionItemTipo = 'producto' | 'servicio'

export interface CotizacionDetalle {
  id: number
  cotizacion_id: number
  tipo: CotizacionItemTipo
  cantidad: number
  descripcion: string
  precio_unitario: number
  costo: number | null
  descuento: number
  subtotal: number
  total: number
  /** Ambos en null = línea escrita a mano. Es esto, y no el tipo, lo que la distingue. */
  producto_id: number | null
  servicio_id: number | null
  referencia: string | null
  producto?: {
    id: number
    nombre: string
    nombre_completo?: string
    sku: string
    /** Para calcular margen cuando la línea no trae costo propio. */
    precio_compra?: string | number | null
    imagenes?: { url: string; url_thumb: string | null; url_medium: string | null; es_principal: boolean }[]
  } | null
  servicio?: {
    id: number
    nombre: string
    codigo?: string
    /** Equivalente al precio de compra en servicios. */
    inversion_estimada?: string | number | null
    imagenes?: { url: string; url_thumb: string | null; url_medium: string | null }[]
  } | null
}

export interface Cotizacion {
  id: number
  numero_cotizacion: string
  cliente_id: number | null
  nombre_cliente: string | null
  usuario_id: number | null
  sucursal_id: number | null
  estado: CotizacionEstado
  /** Fecha sin hora: 'YYYY-MM-DD'. */
  valido_hasta: string
  /** Calculado en el backend: abierta y con la vigencia ya pasada. */
  esta_vencida: boolean
  venta_id: number | null
  subtotal: number
  descuento_total: number
  total: number
  observaciones: string | null
  created_at: string
  /** El backend devuelve el modelo Cliente completo, no un resumen. */
  cliente: ClienteBusqueda | null
  usuario: { id: number; nombres: string; apellidos: string } | null
  venta?: { id: number; numero_venta: string } | null
  detalles: CotizacionDetalle[]
}

export interface CotizacionItemPayload {
  tipo: CotizacionItemTipo
  cantidad: number
  descripcion: string
  precio_unitario: number
  costo?: number | null
  descuento?: number
  producto_id?: number | null
  servicio_id?: number | null
  referencia?: string | null
}

export interface StoreCotizacionPayload {
  items: CotizacionItemPayload[]
  cliente_id?: number | null
  nombre_cliente?: string | null
  sucursal_id?: number | null
  valido_hasta: string
  estado?: 'borrador' | 'enviada'
  observaciones?: string | null
}

export interface CotizacionFiltros {
  search?: string
  /** Admite los estados guardados más 'vigente' y 'vencida', que son derivados. */
  estado?: string
  cliente_id?: string | number
  sucursal_id?: string | number
  vendedor_id?: string | number
  fecha_inicio?: string
  fecha_fin?: string
  sort?: string
  page?: number
  per_page?: number
}

export interface CotizacionConteos {
  total: number
  borrador: number
  enviada: number
  aceptada: number
  rechazada: number
  convertida: number
  vigentes: number
  vencidas: number
}

/** Qué cambió en una línea entre cotizarla y hoy. */
export type CambioLinea = 'precio_subio' | 'precio_bajo' | 'stock_insuficiente' | 'no_disponible'

export interface LineaParaVenta extends CotizacionItemPayload {
  /** Precio vigente en el catálogo. null si la línea no viene del catálogo. */
  precio_actual: number | null
  stock: number | null
  disponible: boolean
  cambios: CambioLinea[]
}

export interface ParaVentaResponse {
  success: boolean
  cotizacion: {
    id: number
    numero_cotizacion: string
    cliente_id: number | null
    cliente: ClienteBusqueda | null
    nombre_cliente: string | null
    sucursal_id: number | null
    observaciones: string | null
    esta_vencida: boolean
    valido_hasta: string | null
  }
  items: LineaParaVenta[]
  avisos: { precio: number; stock: number; no_disponible: number }
}

export interface CotizacionesResponse {
  success: boolean
  cotizaciones: Paginado<Cotizacion>
  conteos: CotizacionConteos
}
