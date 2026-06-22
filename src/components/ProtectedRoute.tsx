import { Navigate, Outlet } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth'

export default function ProtectedRoute() {
  const { usuario, cargando } = useAuth()

  if (cargando) {
    return (
      <div className="login-screen">
        <Loader2 size={28} className="spin" style={{ color: 'var(--accent)' }} />
      </div>
    )
  }

  if (!usuario) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
