import { apiClient } from './client'
import type { Pedido, PedidoEstado, PedidoFiltros, PedidosResponse } from '@/types/pedido'

const BASE = '/pedidos-tienda'

export const pedidosTiendaApi = {
  listar: async (filtros: PedidoFiltros = {}): Promise<PedidosResponse> => {
    const { data } = await apiClient.get<PedidosResponse>(BASE, { params: filtros })
    return data
  },
  obtener: async (id: number): Promise<Pedido> => {
    const { data } = await apiClient.get<{ success: boolean; pedido: Pedido }>(`${BASE}/${id}`)
    return data.pedido
  },
  cambiarEstado: async (id: number, estado: PedidoEstado): Promise<void> => {
    await apiClient.patch(`${BASE}/${id}/estado`, { estado })
  },
}
