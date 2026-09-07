import { Undo2, Wallet } from 'lucide-react'
import { q } from '@/lib/format'
import type { Venta } from '@/types/venta'

/**
 * Marca que parte del total se pagó con el saldo a favor del cliente.
 *
 * Solo en los pagos parciales: si el saldo cubrió todo, `metodo_pago` ya dice
 * "Saldo a favor" y repetirlo sobra. En cambio una venta de Q800 con Q500 de
 * saldo y Q300 en efectivo se veía idéntica a una cobrada entera, cuando a caja
 * solo entraron Q300.
 */
export function InsigniaSaldo({ venta }: { venta: Venta }) {
  const usado = Number(venta.saldo_aplicado ?? 0)
  if (usado <= 0 || venta.metodo_pago === 'saldo') return null

  return (
    <span className="badge" data-tone="info"
      title={`${q(usado)} se pagaron con el saldo a favor del cliente; el resto (${q(Number(venta.total) - usado)}) por el método indicado`}>
      <Wallet size={11} /> {q(usado)} de saldo
    </span>
  )
}

/**
 * Marca que de esta venta volvió mercadería.
 *
 * Va aparte del estado y no dentro de él: una venta devuelta a medias sigue
 * siendo completada —o pendiente si era a crédito—, y meter "devuelta" en
 * `estado` obligaría a elegir cuál de las dos cosas se deja de contar. Además,
 * la veintena de consultas que filtran por `estado = completada` dejarían de
 * verla en silencio.
 */
export function InsigniaDevuelta({ venta }: { venta: Venta }) {
  const devuelto = Number(venta.total_devuelto ?? 0)
  if (devuelto <= 0) return null

  const entera = venta.esta_devuelta

  return (
    <span className="badge" data-tone={entera ? 'neg' : 'warn'}
      title={entera
        ? `Se devolvió completa (${q(devuelto)})`
        : `Devuelto ${q(devuelto)} de ${q(Number(venta.total))} · neto ${q(Number(venta.total_neto))}`}>
      <Undo2 size={11} />
      {entera ? 'Devuelta' : `−${q(devuelto)}`}
    </span>
  )
}
