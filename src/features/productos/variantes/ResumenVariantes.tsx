import { Boxes, Layers } from 'lucide-react'
import { q } from '@/lib/format'
import { nombreDeCombinacion, type Combinacion } from './combinaciones'
import type { FilaVariante } from './MatrizVariantes'

interface ResumenVariantesProps {
  nombreBase: string
  combinaciones: Combinacion[]
  filas: Record<string, FilaVariante>
}

/**
 * Lo que se va a crear, con el nombre final de cada variante tal como se verá
 * en el catálogo. Es la última oportunidad de notar que el nombre base ya
 * incluía la talla, o que una combinación no debería existir.
 */
export function ResumenVariantes({ nombreBase, combinaciones, filas }: ResumenVariantesProps) {
  const incluidas = combinaciones.filter((c) => filas[c.clave]?.incluida !== false)

  if (incluidas.length === 0) {
    return (
      <div className="muted" style={{ fontSize: 12.5 }}>
        Define los atributos que varían para ver aquí lo que se creará.
      </div>
    )
  }

  const unidades = incluidas.reduce((s, c) => s + (Number(filas[c.clave]?.stock) || 0), 0)
  const inversion = incluidas.reduce(
    (s, c) => s + (Number(filas[c.clave]?.precio_compra) || 0) * (Number(filas[c.clave]?.stock) || 0),
    0,
  )

  return (
    <div className="resumen-variantes">
      <div className="resumen-cifras">
        <div>
          <Layers size={13} />
          <b>{incluidas.length}</b> {incluidas.length === 1 ? 'producto' : 'productos'}
        </div>
        <div>
          <Boxes size={13} />
          <b>{unidades}</b> {unidades === 1 ? 'unidad' : 'unidades'}
        </div>
      </div>

      {inversion > 0 && (
        <div className="muted" style={{ fontSize: 11.5 }}>
          Inversión en inventario: <b>{q(inversion)}</b>
        </div>
      )}

      <ul className="resumen-lista">
        {incluidas.map((combo) => {
          const fila = filas[combo.clave]
          return (
            <li key={combo.clave}>
              <span className="resumen-nombre">{nombreDeCombinacion(nombreBase, combo)}</span>
              <span className="muted">
                {fila?.sku || 'sin SKU'}
                {fila?.precio_venta ? ` · ${q(Number(fila.precio_venta))}` : ''}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
