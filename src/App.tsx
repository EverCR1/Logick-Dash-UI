import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import AppLayout from '@/components/layout/AppLayout'
import ProtectedRoute from '@/components/ProtectedRoute'
import RoleGuard from '@/components/RoleGuard'
import LoginPage from '@/features/auth/LoginPage'
import ForgotPasswordPage from '@/features/auth/ForgotPasswordPage'
import ResetPasswordPage from '@/features/auth/ResetPasswordPage'
import PlaceholderPage from '@/components/PlaceholderPage'
import { NAV, type NavItem } from '@/config/nav'

// El dashboard y cada módulo se cargan bajo demanda (code-splitting).
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'))
const ProductosPage = lazy(() => import('@/features/productos/ProductosPage'))
const ProductoDetalle = lazy(() => import('@/features/productos/ProductoDetalle'))
const ProductoFormPage = lazy(() => import('@/features/productos/ProductoFormPage'))
const ClientesPage = lazy(() => import('@/features/clientes/ClientesPage'))
const ClienteDetalle = lazy(() => import('@/features/clientes/ClienteDetalle'))
const ProveedoresPage = lazy(() => import('@/features/proveedores/ProveedoresPage'))
const ProveedorDetalle = lazy(() => import('@/features/proveedores/ProveedorDetalle'))
const SucursalesPage = lazy(() => import('@/features/sucursales/SucursalesPage'))
const SucursalDetalle = lazy(() => import('@/features/sucursales/SucursalDetalle'))
const CategoriasPage = lazy(() => import('@/features/categorias/CategoriasPage'))
const ServiciosPage = lazy(() => import('@/features/servicios/ServiciosPage'))
const ServicioDetalle = lazy(() => import('@/features/servicios/ServicioDetalle'))
const UsuariosPage = lazy(() => import('@/features/usuarios/UsuariosPage'))
const UsuarioDetalle = lazy(() => import('@/features/usuarios/UsuarioDetalle'))
const CuponesPage = lazy(() => import('@/features/cupones/CuponesPage'))
const ResenasPage = lazy(() => import('@/features/resenas/ResenasPage'))
const PreguntasPage = lazy(() => import('@/features/preguntas/PreguntasPage'))
const ReportesTiendaPage = lazy(() => import('@/features/reportes-tienda/ReportesTiendaPage'))
const AuditoriaPage = lazy(() => import('@/features/auditoria/AuditoriaPage'))
const ReportesPage = lazy(() => import('@/features/reportes/ReportesPage'))
const DetalleReporte = lazy(() => import('@/features/reportes/detalle/DetalleReporte'))
const CreditosPage = lazy(() => import('@/features/creditos/CreditosPage'))
const CreditoDetalle = lazy(() => import('@/features/creditos/CreditoDetalle'))
const PedidosPage = lazy(() => import('@/features/pedidos/PedidosPage'))
const VentasPage = lazy(() => import('@/features/ventas/VentasPage'))
const NuevaVenta = lazy(() => import('@/features/ventas/NuevaVenta'))
const CotizacionesPage = lazy(() => import('@/features/cotizaciones/CotizacionesPage'))
const NuevaCotizacion = lazy(() => import('@/features/cotizaciones/NuevaCotizacion'))

// Aplana los items de navegación; el dashboard tiene su propia página, el resto
// son placeholders hasta que construyamos cada módulo.
const items: NavItem[] = NAV.flatMap((e) => ('type' in e ? e.items : [e]))

// Módulos ya implementados con su propia página
const PAGINAS: Record<string, React.ComponentType> = {
  '/productos': ProductosPage,
  '/clientes': ClientesPage,
  '/proveedores': ProveedoresPage,
  '/sucursales': SucursalesPage,
  '/categorias': CategoriasPage,
  '/servicios': ServiciosPage,
  '/usuarios': UsuariosPage,
  '/cupones': CuponesPage,
  '/resenas': ResenasPage,
  '/preguntas': PreguntasPage,
  '/reportes-tienda': ReportesTiendaPage,
  '/auditoria': AuditoriaPage,
  '/reportes': ReportesPage,
  '/creditos': CreditosPage,
  '/pedidos': PedidosPage,
  '/ventas': VentasPage,
  '/cotizaciones': CotizacionesPage,
}

function CargandoPagina() {
  return (
    <div className="empty" style={{ padding: 100 }}>
      <Loader2 size={26} className="spin" style={{ color: 'var(--accent)' }} />
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/password/forgot" element={<ForgotPasswordPage />} />
      <Route path="/password/reset/:token" element={<ResetPasswordPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          {/* El dashboard es visible para todos los roles */}
          <Route index element={<Suspense fallback={<CargandoPagina />}><DashboardPage /></Suspense>} />

          {/* RoleGuard aplica el control por rol (mismo mapa que el sidebar) a
              todos los módulos y sus rutas de detalle */}
          <Route element={<RoleGuard />}>
            <Route path="/usuarios/:id" element={<Suspense fallback={<CargandoPagina />}><UsuarioDetalle /></Suspense>} />
            <Route path="/clientes/:id" element={<Suspense fallback={<CargandoPagina />}><ClienteDetalle /></Suspense>} />
            <Route path="/proveedores/:id" element={<Suspense fallback={<CargandoPagina />}><ProveedorDetalle /></Suspense>} />
            <Route path="/sucursales/:id" element={<Suspense fallback={<CargandoPagina />}><SucursalDetalle /></Suspense>} />
            <Route path="/productos/nuevo" element={<Suspense fallback={<CargandoPagina />}><ProductoFormPage /></Suspense>} />
            <Route path="/productos/:id/editar" element={<Suspense fallback={<CargandoPagina />}><ProductoFormPage /></Suspense>} />
            <Route path="/productos/:id" element={<Suspense fallback={<CargandoPagina />}><ProductoDetalle /></Suspense>} />
            <Route path="/servicios/:id" element={<Suspense fallback={<CargandoPagina />}><ServicioDetalle /></Suspense>} />
            <Route path="/creditos/:id" element={<Suspense fallback={<CargandoPagina />}><CreditoDetalle /></Suspense>} />
            <Route path="/ventas/nueva" element={<Suspense fallback={<CargandoPagina />}><NuevaVenta /></Suspense>} />
            <Route path="/cotizaciones/nueva" element={<Suspense fallback={<CargandoPagina />}><NuevaCotizacion /></Suspense>} />
            <Route path="/cotizaciones/:id/editar" element={<Suspense fallback={<CargandoPagina />}><NuevaCotizacion /></Suspense>} />
            {/* Vistas de detalle de reportes; heredan los roles de /reportes por prefijo */}
            <Route path="/reportes/detalle/:modulo" element={<Suspense fallback={<CargandoPagina />}><DetalleReporte /></Suspense>} />
            {items
              .filter((it) => it.to !== '/')
              .map((it) => {
                const Pagina = PAGINAS[it.to]
                return (
                  <Route
                    key={it.to}
                    path={it.to}
                    element={
                      Pagina
                        ? <Suspense fallback={<CargandoPagina />}><Pagina /></Suspense>
                        : <PlaceholderPage title={it.label} icon={it.icon} />
                    }
                  />
                )
              })}
          </Route>
        </Route>
      </Route>
    </Routes>
  )
}
