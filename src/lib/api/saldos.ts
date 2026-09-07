import { apiClient } from './client'
import type {
  MovimientoSaldo, MovimientoSaldoPayload, SaldoDeCliente,
} from '@/types/saldo'

interface RespuestaMovimiento {
  success: boolean
  movimiento: MovimientoSaldo
  /** Saldo del cliente ya recalculado tras el movimiento. */
  saldo: number
}

export const saldosApi = {
  /** Saldo y movimientos de un cliente concreto. */
  porCliente: async (clienteId: number): Promise<SaldoDeCliente> => {
    const { data } = await apiClient.get<SaldoDeCliente>(`/saldos/cliente/${clienteId}`)
    return data
  },
  /** Dinero que el cliente deja adelantado para un trabajo futuro. */
  anticipo: async (payload: MovimientoSaldoPayload): Promise<RespuestaMovimiento> => {
    const { data } = await apiClient.post<RespuestaMovimiento>('/saldos/anticipo', payload)
    return data
  },
  /** Corrección manual del saldo. Monto negativo para restar. */
  ajustar: async (payload: MovimientoSaldoPayload): Promise<RespuestaMovimiento> => {
    const { data } = await apiClient.post<RespuestaMovimiento>('/saldos/ajuste', payload)
    return data
  },
  /** Solo concepto y fecha: el monto se corrige con un ajuste. */
  actualizar: async (id: number, payload: { concepto: string; fecha: string }): Promise<MovimientoSaldo> => {
    const { data } = await apiClient.put<{ success: boolean; movimiento: MovimientoSaldo }>(`/saldos/${id}`, payload)
    return data.movimiento
  },
  /** El cliente pide de vuelta el dinero que tenía a favor. */
  reembolsar: async (payload: MovimientoSaldoPayload): Promise<RespuestaMovimiento> => {
    const { data } = await apiClient.post<RespuestaMovimiento>('/saldos/reembolsar', payload)
    return data
  },
}
