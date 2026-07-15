import { apiClient, setToken, clearToken } from './client'
import type { CambiarPasswordPayload, LoginPayload, LoginResponse, PerfilPayload, Usuario } from '@/types/auth'

/**
 * Servicio de autenticación. Patrón a seguir por el resto de módulos:
 * un objeto con métodos que solo añaden su endpoint a la ruta base del cliente.
 */
export const authApi = {
  login: async (payload: LoginPayload): Promise<LoginResponse> => {
    const { data } = await apiClient.post<LoginResponse>('/login', payload)
    if (data.access_token) setToken(data.access_token)
    return data
  },

  perfil: async (): Promise<Usuario> => {
    const { data } = await apiClient.get<{ success: boolean; user: Usuario }>('/profile')
    return data.user
  },

  actualizarPerfil: async (payload: PerfilPayload): Promise<void> => {
    await apiClient.put('/profile', payload)
  },

  cambiarPassword: async (payload: CambiarPasswordPayload): Promise<void> => {
    await apiClient.post('/change-password', payload)
  },

  // Recuperación de contraseña (público). El backend responde siempre un mensaje genérico.
  solicitarReset: async (email: string): Promise<string> => {
    const { data } = await apiClient.post<{ success: boolean; message: string }>('/password/forgot', { email })
    return data.message
  },

  restablecerPassword: async (payload: {
    email: string; token: string; password: string; password_confirmation: string
  }): Promise<string> => {
    const { data } = await apiClient.post<{ success: boolean; message: string }>('/password/reset', payload)
    return data.message
  },

  logout: async (): Promise<void> => {
    try {
      await apiClient.post('/logout')
    } finally {
      clearToken()
    }
  },
}
