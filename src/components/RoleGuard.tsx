import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { useEffect, useRef } from 'react'
import { useAuth } from '@/lib/auth'
import { puedeAcceder } from '@/config/nav'

/**
 * Guard por rol para rutas ya autenticadas. Complementa a `ProtectedRoute`
 * (que solo exige sesión): si el rol del usuario no puede ver el módulo,
 * redirige al dashboard en lugar de renderizar una página que la API negaría.
 * La visibilidad por rol se toma del mismo mapa que usa el sidebar (`nav.ts`).
 */
export default function RoleGuard() {
  const { usuario } = useAuth()
  const location = useLocation()
  const permitido = puedeAcceder(location.pathname, usuario?.rol)

  // Aviso una sola vez por bloqueo, sin romper el render de la redirección
  const aviso = useRef<string | null>(null)
  useEffect(() => {
    if (!permitido && aviso.current !== location.pathname) {
      aviso.current = location.pathname
      toast.error('No tienes acceso a esa sección.')
    }
  }, [permitido, location.pathname])

  if (!permitido) return <Navigate to="/" replace />

  return <Outlet />
}
