import { AlertTriangle, TrendingUp, TrendingDown, PackageX, Tag, X } from 'lucide-react'
import { q } from '@/lib/format'
import type { LineaParaRepetir, ParaRepetirResponse } from '@/types/venta'

/**
 * Lo que cambió entre la venta original y hoy.
 *
 * Es el reverso del aviso de cotizaciones: allí se precarga el precio prometido
 * y se avisa de que el catálogo cambió; aquí se precarga el precio de hoy y se
 * avisa de en cuánto difiere del que se cobró la vez pasada. La diferencia
 * importa porque una venta anterior no compromete a nada, pero el vendedor sí
 * necesita ver que el cliente va a pagar otra cifra que la última vez.
 */

const ETIQUETA: Record<string, { icon: typeof AlertTriangle; texto: (l: LineaParaRepetir) => string }> = {
  precio_subio: {
    icon: TrendingUp,
    texto: (l) => `subió de ${q(l.precio_anterior)} a ${q(l.precio_unitario)}`,
  },
  precio_bajo: {
    icon: TrendingDown,
    texto: (l) => `bajó de ${q(l.precio_anterior)} a ${q(l.precio_unitario)}`,
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

export function DiferenciasRepetir({ datos, onCerrar }: {
  datos: ParaRepetirResponse
  onCerrar: () => void
}) {
  const conCambios = datos.items.filter((l) => l.cambios.length > 0)
  // Los descuentos no se copian, pero si la venta original llevaba alguno hay
  // que decirlo: si no, se aplicaría uno menos sin que nadie lo note.
  const conDescuento = datos.items.filter((l) => Number(l.descuento_previo) > 0)

  if (conCambios.length === 0 && conDescuento.length === 0) return null

  return (
    <div className="cot-diferencias">
      <div className="cot-dif-head">
        <AlertTriangle size={15} />
        <div style={{ flex: 1 }}>
          <strong>{datos.venta.numero_venta}</strong>
          {' se registró con otras condiciones que las de hoy.'}
        </div>
        <button type="button" className="icon-btn" title="Ocultar aviso" onClick={onCerrar}><X size={14} /></button>
      </div>

      <ul className="cot-dif-lista">
        {conCambios.map((l, i) => (
          <li key={`c${i}`}>
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
        {conDescuento.map((l, i) => (
          <li key={`d${i}`}>
            <span className="cot-dif-nombre">{l.descripcion}</span>
            <span className="cot-dif-chip" data-tipo="precio_bajo">
              <Tag size={11} /> llevaba {q(l.descuento_previo)} de descuento
            </span>
          </li>
        ))}
      </ul>

      <div className="cot-dif-pie">
        Los precios cargados son los de hoy, no los de aquella venta. Los descuentos
        no se copian: vuelve a aplicarlos abajo si corresponde.
      </div>
    </div>
  )
}
