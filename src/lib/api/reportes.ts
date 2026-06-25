import { apiClient } from './client'
import type {
  ClienteTop, GananciaGrupo, GananciaItem, GananciasCatalogos, GananciasResumen, InventarioProducto,
  InventarioResumen, PedidoReporte, ProductoVendido, ResumenData, ServicioRealizado, SucursalReporte,
  SucursalesResumen, TiendaResumen, VendedorRendimiento, VentaReporte, VentasResumen,
} from '@/types/reporte'

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

  tiendaPedidos: (params: Params) =>
    get<{ success: boolean; pedidos: PedidoReporte[]; resumen: TiendaResumen }>('/reportes/tienda-pedidos', params),
}
