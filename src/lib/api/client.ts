import axios from 'axios'
import { env } from '@/config/env'

/**
 * Cliente HTTP central del dashboard.
 *
 * La ruta base se define una sola vez (env.apiUrl). Cada servicio solo añade
 * su endpoint relativo, p. ej. apiClient.get('/productos').
 */
export const apiClient = axios.create({
  baseURL: env.apiUrl,
  timeout: 15000,
  headers: { Accept: 'application/json' },
})

// ── Token de sesión ──────────────────────────────────────────────────────────
// Mientras la auth use Bearer; al migrar a cookies httpOnly esto se elimina.
const TOKEN_KEY = 'dash_token'

export const getToken   = (): string | null => localStorage.getItem(TOKEN_KEY)
export const setToken   = (token: string): void => localStorage.setItem(TOKEN_KEY, token)
export const clearToken = (): void => localStorage.removeItem(TOKEN_KEY)

// Adjunta el token a cada petición si existe
apiClient.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Sesión expirada → limpia y manda al login
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearToken()
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)
