// Tipos del módulo de análisis (ReporteController). Las respuestas son
// agregaciones; tipamos las formas que la UI realmente renderiza.

export interface RangoFechas {
  fecha_inicio?: string
  fecha_fin?: string
}

export interface ResumenData {
  ventas: { hoy: number; semana: number; mes: number; total: number; promedio_diario: number }
  clientes: { total: number; activos: number; nuevos_mes: number; con_ventas: number }
  productos: { total: number; stock_bajo: number; agotados: number; valor_inventario: number }
  usuarios: { total: number; activos: number }
}

export interface VentaReporte {
  id: number
  total: number
  metodo_pago: string | null
  estado: string
  created_at: string
  cliente: { id: number; nombre: string } | null
  vendedor: { id: number; nombres: string; apellidos: string } | null
}

export interface VentasResumen {
  total_ventas: number
  monto_total: number
  promedio_venta: number | null
  venta_maxima: number | null
  venta_minima: number | null
  por_metodo_pago: Record<string, { cantidad: number; total: number }>
}

export interface ProductoVendido {
  producto_id: number
  veces_vendido: number
  total_unidades: number
  total_vendido: number
  producto: { id: number; nombre: string; sku: string } | null
}

export interface ServicioRealizado {
  servicio_id: number
  veces_realizado: number
  total_unidades: number
  total_facturado: number
  servicio: { id: number; nombre: string } | null
}

export interface ClienteTop {
  id: number
  nombre: string
  ventas_count: number
  total_comprado: number | null
}

export interface VendedorRendimiento {
  id: number
  nombres: string
  apellidos: string
  rol: string
  ventas_count: number
  total_ventas: number
}

export interface InventarioResumen {
  total_productos: number
  valor_total_inventario: number
  valor_venta_total: number
  productos_bajo_stock: number
  productos_agotados: number
}

export interface SucursalReporte {
  id: number
  nombre: string
  estado: string
  usuarios_count: number
  total_transacciones: number
  ventas_completadas: number
  ventas_pendientes: number
  ventas_canceladas: number
  monto_total: number
  promedio_venta: number
}

export interface GananciaItem {
  nombre: string
  tipo: string
  unidades: number
  ingresos: number
  costo_total: number
  ganancia: number
  margen: number
  tiene_costo: boolean
}

export interface GananciasResumen {
  ingresos_totales: number
  costos_totales: number
  ganancia_neta: number
  margen_porcentaje: number
  items_vendidos: number
}

export interface GananciaGrupo {
  nombre: string
  ingresos: number
  costos: number
  ganancia: number
  margen: number
}

export interface GananciasCatalogos {
  sucursales: { id: number; nombre: string }[]
  vendedores: { id: number; nombre: string }[]
}

export interface InventarioProducto {
  id: number
  sku: string
  nombre: string
  marca: string | null
  stock: number
  stock_minimo: number
  precio_compra: number
  precio_venta: number
  proveedor: { id: number; nombre: string } | null
  categorias: { id: number; nombre: string }[]
}

export interface SucursalesResumen {
  total_sucursales: number
  sucursales_activas: number
  monto_total_global: number
  transacciones_total: number
  mejor_sucursal: string
}

// ── Tienda / pedidos ────────────────────────────────────────────────────────
export interface PedidoReporte {
  id: number
  numero_pedido: string
  total: number
  metodo_pago: string | null
  estado: string
  created_at: string
  cuenta: { id: number; nombre: string; apellido: string; email: string } | null
}

export interface TiendaResumen {
  total_pedidos: number
  monto_total: number
  promedio: number
  pedido_maximo: number
  por_estado: Record<string, { cantidad: number; total: number }>
  por_metodo_pago: Record<string, { cantidad: number; total: number }>
}
