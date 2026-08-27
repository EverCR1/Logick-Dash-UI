import { AlertTriangle, TrendingUp, TrendingDown, PackageX, X } from 'lucide-react'
import { q } from '@/lib/format'
import type { LineaParaVenta, ParaVentaResponse } from '@/types/cotizacion'

/**
 * Lo que cambió entre cotizar y vender.
 *
 * Es la pieza que hace confiable la conversión: sin ella, registrar una venta a
 * partir de una cotización de hace un mes metería precios viejos sin que nadie
 * lo notara. El precio que se precarga sigue siendo el cotizado —es lo que se
 * le prometió al cliente— y aquí solo se avisa de la diferencia.
 */

const ETIQUETA: Record<string, { icon: typeof AlertTriangle; texto: (l: LineaParaVenta) => string }> = {
  precio_subio: {
    icon: TrendingUp,
    texto: (l) => `subió de ${q(l.precio_unitario)} a ${q(l.precio_actual ?? 0)}`,
  },
  precio_bajo: {
    icon: TrendingDown,
    texto: (l) => `bajó de ${q(l.precio_unitario)} a ${q(l.precio_actual ?? 0)}`,
  },
  stock_insuficiente: {
    icon: PackageX,
    texto: (l) => `pide ${l.cantidad} y quedan ${l.stock ?? 0}`,
  },
  no_disponible: {
    icon: X,
    texto: () => 'ya no está disponible en el catálogo',
  },
}

interface Props {
  datos: ParaVentaResponse
  onCerrar: () => void
}

export function DiferenciasCotizacion({ datos, onCerrar }: Props) {
  const conCambios = datos.items.filter((l) => l.cambios.length > 0)
  const vencida = datos.cotizacion.esta_vencida

  if (conCambios.length === 0 && !vencida) return null

  return (
    <div className="cot-diferencias">
      <div className="cot-dif-head">
        <AlertTriangle size={15} />
        <div style={{ flex: 1 }}>
          <strong>{datos.cotizacion.numero_cotizacion}</strong>
          {vencida
            ? ' venció, y algunas líneas cambiaron desde que se cotizó.'
            : ' tiene líneas que cambiaron desde que se cotizó.'}
        </div>
        <button type="button" className="icon-btn" title="Ocultar aviso" onClick={onCerrar}><X size={14} /></button>
      </div>

      <ul className="cot-dif-lista">
        {conCambios.map((l, i) => (
          <li key={i}>
            <span className="cot-dif-nombre">{l.descripcion}</span>
            {l.cambios.map((c) => {
              const e = ETIQUETA[c]
              if (!e) return null
              const Icon = e.icon
              return (
                <span key={c} className="cot-dif-chip" data-tipo={c}>
                  <Icon size={11} /> {e.texto(l)}
                </span>
              )
            })}
          </li>
        ))}
      </ul>

      <div className="cot-dif-pie">
        Los precios cargados son los que se cotizaron. Ajústalos abajo si decides
        cobrar los de hoy.
      </div>
    </div>
  )
}
