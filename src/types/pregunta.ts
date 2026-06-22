import type { Paginado } from './producto'

export type PreguntaEstado = 'pendiente' | 'respondida' | 'rechazada'

export interface Pregunta {
  id: number
  producto_id: number
  cuenta_id: number | null
  pregunta: string
  respuesta: string | null
  respondido_por: number | null
  estado: PreguntaEstado
  created_at: string
  cuenta: { id: number; nombre: string; apellido: string | null } | null
  producto: { id: number; nombre: string } | null
}

export interface PreguntaFiltros {
  estado?: string
  page?: number
  per_page?: number
}

export interface PreguntaCounts {
  total: number
  pendiente: number
  respondida: number
  rechazada: number
}

export interface PreguntasResponse {
  success: boolean
  preguntas: Paginado<Pregunta>
  counts: PreguntaCounts
}

export interface PreguntaUpdatePayload {
  estado: PreguntaEstado
  respuesta?: string | null
}
