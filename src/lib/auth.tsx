import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { authApi } from '@/lib/api/auth'
import { getToken, clearToken } from '@/lib/api/client'
import type { Usuario, LoginPayload } from '@/types/auth'

interface AuthContextValue {
  usuario: Usuario | null
  cargando: boolean
  login: (payload: LoginPayload) => Promise<void>
  logout: () => Promise<void>
  refrescarPerfil: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  usuario: null,
  cargando: true,
  login: async () => {},
  logout: async () => {},
  refrescarPerfil: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [cargando, setCargando] = useState(true)

  // Al iniciar: si hay token guardado, valida la sesión cargando el perfil
  useEffect(() => {
    if (!getToken()) {
      setCargando(false)
      return
    }
    authApi
      .perfil()
      .then(setUsuario)
      .catch(() => clearToken())
      .finally(() => setCargando(false))
  }, [])

  const login = async (payload: LoginPayload) => {
    const res = await authApi.login(payload)
    setUsuario(res.user)
  }

  const logout = async () => {
    await authApi.logout()
    setUsuario(null)
  }

  const refrescarPerfil = async () => {
    const u = await authApi.perfil()
    setUsuario(u)
  }

  return (
    <AuthContext.Provider value={{ usuario, cargando, login, logout, refrescarPerfil }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}
