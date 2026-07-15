import type { AreaPoint } from '@/components/charts'

// Bloque de margen/utilidad por tipo (para el toggle Prod/Serv/Todo)
export interface BloqueRenta {
  margen_pct: number
  margen_delta_pts: number
  utilidad: number
  ingresos: number
  utilidad_delta_pct: number | null
  top_item: string | null
}

export interface ItemRentaProducto {
  nombre: string
  categoria: string
  stock: number
  stock_minimo: number
  precio: number
  margen_pct: number
  utilidad_u: number
  estado: 'agotado' | 'bajo' | 'ok'
  ganancia: number
}

export interface ItemRentaServicio {
  nombre: string
  precio: number
  margen_pct: number
  utilidad_u: number
  unidades: number
  ganancia: number
}

export interface Rentabilidad {
  productos: BloqueRenta
  servicios: BloqueRenta
  total: BloqueRenta
  rotacion: { veces: number; delta: number }
  rotacion_categorias: { nombre: string; veces: number }[]
  items_productos: ItemRentaProducto[]
  items_servicios: ItemRentaServicio[]
}

export interface DashboardData {
  ventas: {
    hoy: { total: number; count: number }
    semana: { total: number; count: number }
    mes: { total: number; count: number }
    promedio_venta: number
    venta_maxima: number
  }
  rentabilidad: Rentabilidad
  serie_ventas: {
    serie: AreaPoint[]
    ingreso_total: number
    transacciones: number
    ticket_promedio: number
  }
  metodos_pago: {
    total: number
    items: { metodo: string; value: number; share: number }[]
  }
  top_productos: { name: string; sku: string; sold: number; revenue: number }[]
  top_clientes: { name: string; initials: string; compras: number; total: number }[]
  clientes: { total: number; activos: number; nuevos_semana: number }
  productos: { total: number; stock_bajo: number; agotados: number; valor_inventario: number }
  servicios: { total: number; activos: number }
  creditos: { activos: number; capital_pendiente: number }
  proveedores: { total: number; activos: number }
  categorias: { total: number; nivel_0: number }
  tienda: {
    pedidos_hoy: number
    pedidos_mes: number
    pedidos_mes_delta: number | null
    ingresos_mes: number
    pendientes: number
    por_estado: Record<string, number>
    resenas: { pendiente: number; publicado: number; rechazado: number }
    preguntas: { pendiente: number; respondida: number; rechazada: number }
  }
  pedidos_recientes: { numero: string; cliente: string; estado: string; total: number }[]
}
