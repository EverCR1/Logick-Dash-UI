import type { Paginado } from './producto'

export type ReporteEstado = 'pendiente' | 'en_revision' | 'resuelto' | 'invalido'

export type ReporteCategoria = 'pedido' | 'pago' | 'producto' | 'cuenta' | 'envio' | 'tienda' | 'otro'

// Etiquetas legibles (espejo de Tienda\ReporteController::CATEGORIAS)
export const REPORTE_CATEGORIAS: Record<ReporteCategoria, string> = {
  pedido: 'Problema con mi pedido',
  pago: 'Problema con el pago',
  producto: 'Producto incorrecto o dañado',
  cuenta: 'Problema con mi cuenta',
  envio: 'Problema con el envío',
  tienda: 'Error en la tienda en línea',
  otro: 'Otro',
}

export interface ReporteProblema {
  id: number
  cuenta_id: number | null
  categoria: ReporteCategoria
  categoria_label: string
  descripcion: string
  nombre_contacto: string | null
  email_contacto: string | null
  telefono_contacto: string | null
  estado: ReporteEstado
  puntos_otorgados: number | null
  nota_admin: string | null
  ip_address: string | null
  created_at: string
  cuenta: { id: number; nombre: string; apellido: string | null; email: string; puntos_saldo?: number } | null
}

export interface ReporteFiltros {
  estado?: string
  categoria?: string
  page?: number
  per_page?: number
}

export interface ReporteCounts {
  total: number
  pendiente: number
  en_revision: number
  resuelto: number
  invalido: number
}

export interface ReportesResponse {
  success: boolean
  reportes: Paginado<ReporteProblema>
  counts: ReporteCounts
}

export interface ReporteUpdatePayload {
  estado: ReporteEstado
  nota_admin?: string | null
  puntos_otorgados?: number | null
}
