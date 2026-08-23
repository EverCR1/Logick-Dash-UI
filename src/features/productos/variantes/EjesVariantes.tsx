import { useState, type KeyboardEvent } from 'react'
import { Plus, X, Layers, TriangleAlert } from 'lucide-react'
import { esEjeColor, totalCombinaciones, type Eje } from './combinaciones'

/** A partir de aquí se avisa, pero no se bloquea: puede ser intencional. */
const AVISO_COMBINACIONES = 50

interface EjesVariantesProps {
  ejes: Eje[]
  onChange: (ejes: Eje[]) => void
  /** Combinaciones que el backend acepta por lote. */
  maximo: number
}

/**
 * Define qué distingue a las variantes: un atributo por fila y sus valores como
 * chips. Es la entrada de la matriz — de aquí sale el producto cartesiano.
 */
export function EjesVariantes({ ejes, onChange, maximo }: EjesVariantesProps) {
  const total = ejes.length > 0 ? totalCombinaciones(ejes) : 0
  const excede = total > maximo
  const muchas = total > AVISO_COMBINACIONES && !excede

  const setEje = (i: number, patch: Partial<Eje>) =>
    onChange(ejes.map((e, idx) => (idx === i ? { ...e, ...patch } : e)))

  const agregar = () => onChange([...ejes, { nombre: '', valores: [] }])
  const quitar = (i: number) => onChange(ejes.filter((_, idx) => idx !== i))

  return (
    <div className="ejes-box">
      <div className="muted" style={{ fontSize: 12 }}>
        Cada atributo con todos sus valores. Se creará una variante por cada
        combinación posible — un atributo llamado <b>Color</b> se guarda como el
        color del producto, no como atributo.
      </div>

      {ejes.length === 0 && (
        <div className="muted" style={{ fontSize: 12.5 }}>
          Sin atributos todavía. Agrega uno para empezar.
        </div>
      )}

      {ejes.map((eje, i) => (
        <FilaEje key={i} eje={eje} onChange={(patch) => setEje(i, patch)} onQuitar={() => quitar(i)} />
      ))}

      <div className="ejes-pie">
        <button type="button" className="btn btn-sm" onClick={agregar}>
          <Plus size={13} /> Añadir atributo
        </button>

        {total > 0 && (
          <span className="ejes-conteo" data-tono={excede ? 'neg' : muchas ? 'warn' : undefined}>
            <Layers size={13} />
            Se crearán <b>{total}</b> {total === 1 ? 'variante' : 'variantes'}
          </span>
        )}
      </div>

      {/* El número crece multiplicando: tres atributos de tres valores son 27,
          no 9. Conviene avisarlo antes de generar la matriz. */}
      {muchas && (
        <div className="aviso-inline" data-tono="warn">
          <TriangleAlert size={13} />
          <span>
            Son {total} productos distintos. Cada valor que añadas multiplica el total, no lo suma.
            Puedes destildar en la tabla las combinaciones que no existan.
          </span>
        </div>
      )}
      {excede && (
        <div className="aviso-inline" data-tono="neg">
          <TriangleAlert size={13} />
          <span>Son {total} combinaciones y el máximo por lote es {maximo}. Quita algún valor.</span>
        </div>
      )}
    </div>
  )
}

function FilaEje({ eje, onChange, onQuitar }: {
  eje: Eje
  onChange: (patch: Partial<Eje>) => void
  onQuitar: () => void
}) {
  const [borrador, setBorrador] = useState('')
  const esColor = esEjeColor(eje.nombre)

  const agregarValor = () => {
    const valor = borrador.trim()
    // Repetir un valor duplicaría combinaciones idénticas
    if (!valor || eje.valores.some((v) => v.toLowerCase() === valor.toLowerCase())) { setBorrador(''); return }
    onChange({ valores: [...eje.valores, valor] })
    setBorrador('')
  }

  const onTecla = (e: KeyboardEvent<HTMLInputElement>) => {
    // Enter y coma añaden el valor; Enter no debe enviar el formulario
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); agregarValor(); return }
    if (e.key === 'Backspace' && !borrador && eje.valores.length) {
      onChange({ valores: eje.valores.slice(0, -1) })
    }
  }

  return (
    <div className="eje-fila">
      <div className="eje-nombre">
        <input
          className="form-input"
          value={eje.nombre}
          onChange={(e) => onChange({ nombre: e.target.value })}
          placeholder="Atributo (ej: Capacidad)"
        />
        {esColor && <span className="eje-marca" title="Se guardará como el color del producto">color</span>}
      </div>

      <div className="eje-valores">
        {eje.valores.map((valor, i) => (
          <span key={i} className="multi-chip">
            {valor}
            <button type="button" aria-label={`Quitar ${valor}`}
              onClick={() => onChange({ valores: eje.valores.filter((_, idx) => idx !== i) })}>
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          className="eje-input-valor"
          value={borrador}
          onChange={(e) => setBorrador(e.target.value)}
          onKeyDown={onTecla}
          onBlur={agregarValor}
          placeholder={eje.valores.length
            ? 'Añadir otro valor y Enter'
            : 'Escribe un valor y pulsa Enter (ej: 128GB)'}
        />
        {/* El Enter no se descubre solo: cada valor añadido crea variantes, así
            que el botón hace visible que ahí se sigue agregando. */}
        <button type="button" className="eje-mas" title="Añadir este valor"
          onClick={agregarValor} disabled={!borrador.trim()}>
          <Plus size={14} />
        </button>
      </div>

      <button type="button" className="icon-action" data-variant="delete" title="Quitar atributo" onClick={onQuitar}>
        <X size={15} />
      </button>
    </div>
  )
}
