import type { CotizacionDetalle } from '@/types/cotizacion'

/**
 * Costo y margen de una cotización, para consulta interna.
 *
 * Sigue la misma convención que los reportes: el costo sale de la línea si es
 * personalizada, y si no del precio de compra del producto o de la inversión
 * estimada del servicio. Una línea sin ninguno de los tres **no se cuenta**, en
 * vez de asumir costo cero — eso la haría aparecer con 100% de margen y falsearía
 * el total hacia arriba, que es justo el error caro.
 */

export interface MargenLinea {
  /** Costo unitario aplicable, o null si no hay ninguno registrado. */
  costoUnitario: number | null
  /** Costo de toda la línea. null si no hay costo. */
  costoTotal: number | null
  /** Ingreso de la línea ya con su descuento aplicado. */
  ingreso: number
  ganancia: number | null
  /** Porcentaje sobre el ingreso. null si no hay costo o el ingreso es cero. */
  porcentaje: number | null
}

const num = (v: string | number | null | undefined): number | null => {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export function margenDeLinea(d: CotizacionDetalle): MargenLinea {
  const ingreso = Number(d.total) || 0

  const costoUnitario =
    num(d.costo) ??
    num(d.producto?.precio_compra) ??
    num(d.servicio?.inversion_estimada)

  if (costoUnitario === null) {
    return { costoUnitario: null, costoTotal: null, ingreso, ganancia: null, porcentaje: null }
  }

  const costoTotal = costoUnitario * d.cantidad
  const ganancia = ingreso - costoTotal

  return {
    costoUnitario,
    costoTotal,
    ingreso,
    ganancia,
    porcentaje: ingreso > 0 ? (ganancia / ingreso) * 100 : null,
  }
}

export interface MargenTotal {
  ingreso: number
  costo: number
  ganancia: number
  porcentaje: number | null
  /** Cuántas líneas quedaron fuera por no tener costo registrado. */
  sinCosto: number
}

export function margenTotal(detalles: CotizacionDetalle[]): MargenTotal {
  let ingreso = 0
  let costo = 0
  let sinCosto = 0

  for (const d of detalles) {
    const m = margenDeLinea(d)
    if (m.costoTotal === null) { sinCosto++; continue }
    ingreso += m.ingreso
    costo += m.costoTotal
  }

  const ganancia = ingreso - costo
  return { ingreso, costo, ganancia, porcentaje: ingreso > 0 ? (ganancia / ingreso) * 100 : null, sinCosto }
}
