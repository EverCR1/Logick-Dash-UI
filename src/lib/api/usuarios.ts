import { apiClient } from './client'
import type { Usuario, UsuarioDetalle, UsuarioFiltros, UsuarioPayload, UsuariosResponse } from '@/types/usuario'

export const usuariosApi = {
  listar: async (filtros: UsuarioFiltros = {}): Promise<UsuariosResponse> => {
    const { data } = await apiClient.get<UsuariosResponse>('/users', { params: filtros })
    return data
  },
  obtener: async (id: number): Promise<UsuarioDetalle> => {
    const { data } = await apiClient.get<{ success: boolean } & UsuarioDetalle>(`/users/${id}`)
    return { user: data.user, ventas: data.ventas }
  },
  crear: async (payload: UsuarioPayload): Promise<Usuario> => {
    const { data } = await apiClient.post<{ success: boolean; user: Usuario }>('/users', payload)
    return data.user
  },
  actualizar: async (id: number, payload: UsuarioPayload): Promise<Usuario> => {
    const { data } = await apiClient.put<{ success: boolean; user: Usuario }>(`/users/${id}`, payload)
    return data.user
  },
  eliminar: async (id: number): Promise<void> => {
    await apiClient.delete(`/users/${id}`)
  },
  cambiarEstado: async (id: number, estado: 'activo' | 'inactivo'): Promise<void> => {
    await apiClient.post(`/users/${id}/change-status`, { estado })
  },
}
