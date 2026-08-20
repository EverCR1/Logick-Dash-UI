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
  /** Para abrir el detalle acotado a este item desde la fila del resumen. */
  producto_id: number | null
  servicio_id: number | null
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
  /** Solo lo devuelve el detalle; el resumen no filtra por cliente. */
  clientes?: { id: number; nombre: string }[]
}

// ── Detalle de ganancias: un evento de ingreso sin agregar ──────────────────

/** Línea de una venta, con la fracción ya aplicada si viene de un abono. */
export interface GananciaLinea {
  detalle_id: number
  tipo: string
  producto_id: number | null
  servicio_id: number | null
  nombre: string
  tiene_costo: boolean
  precio_unitario: number
  descuento: number
  costo_unitario: number
  unidades: number
  ingreso: number
  costo: number
}

/**
 * Una venta de contado o un abono de crédito. En los abonos `ratio` es la
 * fracción cobrada de la venta, y los importes ya vienen multiplicados por ella.
 */
export interface GananciaEvento {
  origen: 'contado' | 'abono'
  fecha: string
  metodo: string | null
  ratio: number
  venta_id: number
  numero_venta: string
  cliente_id: number | null
  cliente: string
  sucursal_id: number | null
  sucursal: string
  usuario_id: number | null
  vendedor: string
  pago_id: number | null
  credito_id: number | null
  ingreso: number
  costo: number
  ganancia: number
  items: GananciaLinea[]
}

// ── Detalle a nivel de línea (ventas y tienda) ──────────────────────────────

/**
 * Una línea de venta. Los importes llegan como string porque el modelo los
 * castea a `decimal:2`; conviértelos con Number() antes de operar.
 */
export interface VentaLinea {
  id: number
  tipo: 'producto' | 'servicio' | 'otro'
  cantidad: number
  descripcion: string
  precio_unitario: string
  costo: string | null
  descuento: string
  subtotal: string
  total: string
  producto_id: number | null
  servicio_id: number | null
  referencia: string | null
  venta: {
    id: number
    numero_venta: string
    created_at: string
    metodo_pago: string | null
    estado: string
    cliente: { id: number; nombre: string } | null
    vendedor: { id: number; nombres: string; apellidos: string } | null
    sucursal: { id: number; nombre: string } | null
  } | null
  producto: { id: number; nombre: string; nombre_completo: string; sku: string } | null
  servicio: { id: number; nombre: string; codigo: string } | null
}

export interface VentaLineasResumen {
  lineas: number
  unidades: number
  subtotal: number
  descuentos: number
  total: number
}

/** Una línea de pedido de la tienda, con la ganancia derivada del precio de compra. */
export interface PedidoLinea {
  id: number
  nombre_producto: string
  cantidad: number
  precio_unitario: number
  subtotal: number
  producto_id: number | null
  costo_unitario: number | null
  costo: number
  ganancia: number
  tiene_costo: boolean
  pedido: {
    id: number
    numero_pedido: string
    created_at: string
    nombre: string
    estado: string
    metodo_pago: string | null
    tipo_entrega: 'domicilio' | 'tienda'
    descuento_cupon: string | null
    sucursal: { id: number; nombre: string } | null
    cupon: { id: number; codigo: string } | null
  } | null
  producto: { id: number; nombre: string; nombre_completo: string; sku: string } | null
}

export interface PedidoLineasResumen {
  lineas: number
  unidades: number
  subtotal: number
}

// ── Detalle de inventario y ranking del catálogo ────────────────────────────

/** Producto con su stock actual cruzado contra el movimiento del periodo. */
export interface InventarioDetalleFila {
  id: number
  sku: string
  nombre: string
  nombre_completo: string
  marca: string | null
  estado: string
  stock: number
  stock_minimo: number
  precio_compra: string
  precio_venta: string
  proveedor: { id: number; nombre: string } | null
  categorias: { id: number; nombre: string }[]
  unidades_vendidas: number
  ingreso_generado: number
  valor_compra: number
  valor_venta: number
  margen_unitario: number
  margen_porcentaje: number
  /** Días que aguanta el stock al ritmo del periodo; null si no hubo ventas. */
  dias_cobertura: number | null
  ultima_venta: string | null
}

export interface InventarioDetalleResumen {
  productos: number
  unidades: number
  valor_compra: number
  valor_venta: number
  margen_potencial: number
  bajo_stock: number
  agotados: number
  sin_movimiento: number
  dias_periodo: number
}

/** Fila del ranking: sirve igual para productos y para servicios. */
export interface RankingFila {
  id: number
  nombre: string
  nombre_completo?: string
  sku?: string
  codigo?: string
  marca?: string | null
  estado: string
  stock?: number
  precio_venta: string
  precio_compra?: string
  inversion_estimada?: string | null
  proveedor?: { id: number; nombre: string } | null
  categorias?: { id: number; nombre: string }[]
  unidades_vendidas: number
  veces_vendido: number
  ingreso_generado: number
  costo_estimado: number
  ganancia: number
  margen_porcentaje: number
  tiene_costo: boolean
}

export interface RankingResumen {
  items: number
  con_ventas: number
  sin_ventas: number
  unidades: number
  ingresos: number
}

export interface CatalogosDeCatalogo {
  categorias: { id: number; nombre: string }[]
  proveedores: { id: number; nombre: string }[]
  marcas: string[]
}

// ── Detalle de clientes, vendedores y sucursales ────────────────────────────

export interface ClienteDetalleFila {
  id: number
  nombre: string
  nit: string | null
  email: string | null
  telefono: string | null
  tipo: 'natural' | 'juridico'
  estado: string
  compras: number
  total_comprado: number
  ticket_promedio: number
  primera_compra: string | null
  ultima_compra: string | null
  /** Saldo vivo de crédito: es de hoy, no del rango consultado. */
  saldo_credito: number
  /** Desde su última compra de toda la historia; null si nunca compró. */
  dias_sin_comprar: number | null
}

export interface ClientesDetalleResumen {
  clientes: number
  con_compras: number
  sin_compras: number
  total_comprado: number
  compras: number
  ticket_promedio: number
  saldo_credito: number
}

/** Métricas compartidas por vendedor y por sucursal. */
export interface MetricasGrupo {
  transacciones: number
  facturado: number
  ticket_promedio: number
  ingreso: number
  costo: number
  ganancia: number
  margen_porcentaje: number
  descuentos: number
  unidades_producto: number
  unidades_servicio: number
  ingreso_sin_costo: number
}

export interface VendedorDetalleFila extends MetricasGrupo {
  id: number
  nombre: string
  email: string
  rol: string
  estado: string
  sucursal: string | null
}

export interface VendedoresDetalleResumen {
  vendedores: number
  transacciones: number
  facturado: number
  ganancia: number
  margen_porcentaje: number
  descuentos: number
}

export interface SucursalDetalleFila extends MetricasGrupo {
  /** null en la fila agregada de lo no atribuible a ninguna sucursal. */
  id: number | null
  nombre: string
  direccion: string | null
  estado: string
  usuarios_count: number
  /** Criterio de caja: contado del rango más los abonos cobrados en él. */
  cobrado: number
  /** Cartera viva de hoy, no acotada al rango. */
  por_cobrar: number
  creditos_abiertos: number
  /**
   * Fila de lo no atribuible: ventas anteriores a que existieran las sucursales
   * y créditos registrados a mano. Existe para que los totales cuadren.
   */
  sin_sucursal?: boolean
  cartera_sin_venta?: number
  creditos_sin_venta?: number
  cartera_venta_sin_suc?: number
}

export interface SucursalesDetalleResumen {
  sucursales: number
  transacciones: number
  facturado: number
  cobrado: number
  por_cobrar: number
  ganancia: number
  margen_porcentaje: number
}

export interface TopDeSucursal {
  nombre: string | null
  veces: number
  total: number
}

export interface GananciaEventosResumen {
  eventos: number
  ingresos: number
  costos: number
  ganancia: number
  margen_porcentaje: number
  /** Cuánto del ingreso mostrado proviene de líneas sin costo registrado. */
  ingresos_sin_costo: number
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
