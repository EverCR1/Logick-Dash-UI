import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import AppLayout from '@/components/layout/AppLayout'
import ProtectedRoute from '@/components/ProtectedRoute'
import LoginPage from '@/features/auth/LoginPage'
import PlaceholderPage from '@/components/PlaceholderPage'
import { NAV, type NavItem } from '@/config/nav'

// El dashboard y cada módulo se cargan bajo demanda (code-splitting).
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'))
const ProductosPage = lazy(() => import('@/features/productos/ProductosPage'))
const ProductoDetalle = lazy(() => import('@/features/productos/ProductoDetalle'))
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
const CreditosPage = lazy(() => import('@/features/creditos/CreditosPage'))
const PedidosPage = lazy(() => import('@/features/pedidos/PedidosPage'))
const VentasPage = lazy(() => import('@/features/ventas/VentasPage'))

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

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Suspense fallback={<CargandoPagina />}><DashboardPage /></Suspense>} />
          <Route path="/usuarios/:id" element={<Suspense fallback={<CargandoPagina />}><UsuarioDetalle /></Suspense>} />
          <Route path="/clientes/:id" element={<Suspense fallback={<CargandoPagina />}><ClienteDetalle /></Suspense>} />
          <Route path="/proveedores/:id" element={<Suspense fallback={<CargandoPagina />}><ProveedorDetalle /></Suspense>} />
          <Route path="/sucursales/:id" element={<Suspense fallback={<CargandoPagina />}><SucursalDetalle /></Suspense>} />
          <Route path="/productos/:id" element={<Suspense fallback={<CargandoPagina />}><ProductoDetalle /></Suspense>} />
          <Route path="/servicios/:id" element={<Suspense fallback={<CargandoPagina />}><ServicioDetalle /></Suspense>} />
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
    </Routes>
  )
}
