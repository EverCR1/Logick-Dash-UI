import { apiClient } from './client'
import type { PageMeta } from '@/components/ui/Pagination'
import type {
  CatalogosDeCatalogo, ClienteDetalleFila, ClientesDetalleResumen, ClienteTop, GananciaEvento,
  GananciaEventosResumen, GananciaGrupo, GananciaItem, GananciasCatalogos, GananciasResumen,
  InventarioDetalleFila, InventarioDetalleResumen, InventarioProducto, InventarioResumen, PedidoLinea,
  PedidoLineasResumen, PedidoReporte, ProductoVendido, RankingFila, RankingResumen, ResumenData,
  ServicioRealizado, SucursalDetalleFila, SucursalesDetalleResumen, SucursalReporte, SucursalesResumen,
  TiendaResumen, TopDeSucursal, VendedorDetalleFila, VendedoresDetalleResumen, VendedorRendimiento,
  VentaLinea, VentaLineasResumen, VentaReporte, VentasResumen,
} from '@/types/reporte'

/** Item por el que se filtra, para rotularlo aunque el recorte quede vacío. */
type FiltroItem = { tipo: 'producto' | 'servicio'; id: number; nombre: string } | null

type Params = Record<string, string | number | undefined>

async function get<T>(url: string, params?: Params): Promise<T> {
  const { data } = await apiClient.get<T>(url, { params })
  return data
}

type PorTipo = Record<string, { ingresos: number; costos: number; ganancia: number; unidades: number }>

export const reportesApi = {
  resumen: () => get<{ success: boolean; data: ResumenData }>('/reportes/resumen'),

  ventas: (params: Params) =>
    get<{ success: boolean; ventas: VentaReporte[]; resumen: VentasResumen }>('/reportes/ventas', params),

  productosMasVendidos: (params: Params) =>
    get<{ success: boolean; productos: ProductoVendido[] }>('/reportes/productos-mas-vendidos', params),

  inventario: (params: Params) =>
    get<{ success: boolean; productos: InventarioProducto[]; resumen: InventarioResumen }>('/reportes/inventario', params),

  topClientes: (params: Params) =>
    get<{ success: boolean; clientes: ClienteTop[] }>('/reportes/top-clientes', params),

  rendimientoVendedores: (params: Params) =>
    get<{ success: boolean; vendedores: VendedorRendimiento[] }>('/reportes/rendimiento-vendedores', params),

  serviciosMasRealizados: (params: Params) =>
    get<{ success: boolean; servicios: ServicioRealizado[] }>('/reportes/servicios-mas-realizados', params),

  sucursales: (params: Params) =>
    get<{ success: boolean; sucursales: SucursalReporte[]; resumen: SucursalesResumen }>('/reportes/sucursales', params),

  ganancias: (params: Params) =>
    get<{ success: boolean; resumen: GananciasResumen; por_tipo: PorTipo; items: GananciaItem[]; por_sucursal: GananciaGrupo[]; por_vendedor: GananciaGrupo[]; catalogos: GananciasCatalogos }>('/reportes/ganancias', params),

  gananciasEventos: (params: Params) =>
    get<{
      success: boolean
      data: GananciaEvento[]
      resumen: GananciaEventosResumen
      meta: PageMeta
      catalogos: GananciasCatalogos
      filtro_item: FiltroItem
    }>('/reportes/ganancias/eventos', params),

  clientesDetalle: (params: Params) =>
    get<{
      success: boolean
      data: ClienteDetalleFila[]
      resumen: ClientesDetalleResumen
      meta: PageMeta
    }>('/reportes/top-clientes/detalle', params),

  // Vendedores y sucursales no paginan: son listas de unidades del negocio,
  // no de transacciones, y caben enteras en una pantalla.
  vendedoresDetalle: (params: Params) =>
    get<{
      success: boolean
      data: VendedorDetalleFila[]
      resumen: VendedoresDetalleResumen
      catalogos: { sucursales: { id: number; nombre: string }[] }
    }>('/reportes/rendimiento-vendedores/detalle', params),

  sucursalesDetalle: (params: Params) =>
    get<{
      success: boolean
      data: SucursalDetalleFila[]
      resumen: SucursalesDetalleResumen
      desglose: {
        vendedores: Record<string, TopDeSucursal[]>
        productos: Record<string, TopDeSucursal[]>
      }
    }>('/reportes/sucursales/detalle', params),

  inventarioDetalle: (params: Params) =>
    get<{
      success: boolean
      data: InventarioDetalleFila[]
      resumen: InventarioDetalleResumen
      meta: PageMeta
      catalogos: CatalogosDeCatalogo
    }>('/reportes/inventario/detalle', params),

  catalogoRanking: (params: Params) =>
    get<{
      success: boolean
      data: RankingFila[]
      resumen: RankingResumen
      meta: PageMeta
      catalogos: CatalogosDeCatalogo | Record<string, never>
    }>('/reportes/catalogo/ranking', params),

  ventasLineas: (params: Params) =>
    get<{
      success: boolean
      data: VentaLinea[]
      resumen: VentaLineasResumen
      meta: PageMeta
      catalogos: GananciasCatalogos
      filtro_item: FiltroItem
    }>('/reportes/ventas/lineas', params),

  tiendaLineas: (params: Params) =>
    get<{
      success: boolean
      data: PedidoLinea[]
      resumen: PedidoLineasResumen
      meta: PageMeta
      catalogos: { sucursales: { id: number; nombre: string }[] }
      filtro_item: FiltroItem
    }>('/reportes/tienda-pedidos/lineas', params),

  tiendaPedidos: (params: Params) =>
    get<{ success: boolean; pedidos: PedidoReporte[]; resumen: TiendaResumen }>('/reportes/tienda-pedidos', params),
}
