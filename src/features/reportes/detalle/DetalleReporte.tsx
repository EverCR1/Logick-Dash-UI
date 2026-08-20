import { Link, useParams } from 'react-router-dom'
import { I } from '@/components/icons'
import { DetalleProductos, DetalleServicios } from './DetalleCatalogo'
import { DetalleClientes } from './DetalleClientes'
import { DetalleGanancias } from './DetalleGanancias'
import { DetalleInventario } from './DetalleInventario'
import { DetalleSucursales } from './DetalleSucursales'
import { DetalleTienda } from './DetalleTienda'
import { DetalleVendedores } from './DetalleVendedores'
import { DetalleVentas } from './DetalleVentas'

/**
 * Punto de entrada de /reportes/detalle/:modulo.
 *
 * Cada módulo del resumen va sumando aquí su vista de detalle; los que aún no
 * la tienen caen en el estado de abajo en vez de romper la ruta.
 */
const MODULOS: Record<string, () => React.ReactElement> = {
  ganancias: DetalleGanancias,
  ventas: DetalleVentas,
  tienda: DetalleTienda,
  inventario: DetalleInventario,
  productos: DetalleProductos,
  servicios: DetalleServicios,
  clientes: DetalleClientes,
  vendedores: DetalleVendedores,
  sucursales: DetalleSucursales,
}

export default function DetalleReporte() {
  const { modulo = '' } = useParams()
  const Vista = MODULOS[modulo]

  if (!Vista) {
    return (
      <div className="card">
        <div className="empty" style={{ padding: 80 }}>
          <I.Activity size={26} />
          <div>Este reporte todavía no tiene vista de detalle</div>
          <Link className="btn" style={{ marginTop: 10 }} to="/reportes">Volver a reportes</Link>
        </div>
      </div>
    )
  }

  return <Vista />
}
