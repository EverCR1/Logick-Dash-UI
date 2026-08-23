import { memo, useCallback, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, CheckSquare, CopyCheck, Copy, ImagePlus, RotateCcw, Square } from 'lucide-react'
import { nombreDeCombinacion, type Combinacion } from './combinaciones'
import type { ImagenesDeVariante } from './ImagenesVariante'

/** Lo editable de cada fila de la matriz. */
export interface FilaVariante {
  incluida: boolean
  sku: string
  codigo_barras: string
  precio_compra: string
  precio_venta: string
  precio_oferta: string
  stock: string
  stock_minimo: string
}

export type CampoFila = Exclude<keyof FilaVariante, 'incluida'>

/** Columnas numéricas que aceptan "aplicar a todas" desde el valor base. */
const COLUMNAS: { campo: CampoFila; etiqueta: string; prefijo?: string; ancho?: number }[] = [
  { campo: 'sku', etiqueta: 'SKU', ancho: 170 },
  { campo: 'codigo_barras', etiqueta: 'Cód. barras', ancho: 140 },
  { campo: 'precio_compra', etiqueta: 'Compra', prefijo: 'Q', ancho: 110 },
  { campo: 'precio_venta', etiqueta: 'Venta', prefijo: 'Q', ancho: 110 },
  { campo: 'precio_oferta', etiqueta: 'Oferta', prefijo: 'Q', ancho: 110 },
  { campo: 'stock', etiqueta: 'Stock', ancho: 90 },
  { campo: 'stock_minimo', etiqueta: 'Mínimo', ancho: 90 },
]

/** Campos que se propagan con "aplicar a todas"; el SKU y el código son únicos. */
const PROPAGABLES: CampoFila[] = ['precio_compra', 'precio_venta', 'precio_oferta', 'stock', 'stock_minimo']

interface MatrizVariantesProps {
  nombreBase: string
  combinaciones: Combinacion[]
  filas: Record<string, FilaVariante>
  onCampo: (clave: string, campo: CampoFila, valor: string) => void
  onIncluida: (clave: string, incluida: boolean) => void
  /** Marca o desmarca varias combinaciones de golpe. */
  onIncluirVarias: (claves: string[], incluida: boolean) => void
  onPropagar: (campo: CampoFila) => void
  /** Errores del backend por clave de combinación y campo. */
  errores?: Record<string, Partial<Record<CampoFila, string>>>
  /** Combinaciones desplegadas en móvil. */
  abiertas: Set<string>
  onAlternar: (clave: string) => void
  /** Imágenes elegidas por variante, y quién abre su selector. */
  imagenes: Record<string, ImagenesDeVariante>
  onAbrirImagenes: (clave: string) => void
}

/**
 * Una fila por combinación, con lo que distingue a cada variante.
 *
 * En escritorio es una tabla que se desplaza; en móvil cada variante es una
 * tarjeta plegable. Desplazarse en horizontal para escribir en un campo
 * numérico es de las peores interacciones táctiles que hay — distinto de las
 * tablas de reportes, que son de lectura.
 */
export function MatrizVariantes({
  nombreBase, combinaciones, filas, onCampo, onIncluida, onIncluirVarias, onPropagar,
  errores, abiertas, onAlternar, imagenes, onAbrirImagenes,
}: MatrizVariantesProps) {
  const [verDescartadas, setVerDescartadas] = useState(false)

  const incluidas = combinaciones.filter((c) => filas[c.clave]?.incluida !== false)
  const descartadas = combinaciones.filter((c) => filas[c.clave]?.incluida === false)

  // Cada valor de atributo con las combinaciones en las que aparece: es lo que
  // permite actuar sobre "todas las de 26L" sin ir fila por fila.
  const porValor = useMemo(() => {
    const mapa = new Map<string, { nombre: string; valor: string; claves: string[] }>()
    for (const combo of combinaciones) {
      for (const attr of combo.atributos) {
        const id = `${attr.nombre}=${attr.valor}`
        if (!mapa.has(id)) mapa.set(id, { nombre: attr.nombre, valor: attr.valor, claves: [] })
        mapa.get(id)!.claves.push(combo.clave)
      }
    }
    return [...mapa.values()]
  }, [combinaciones])

  if (combinaciones.length === 0) return null

  const todasClaves = combinaciones.map((c) => c.clave)

  return (
    <div className="matriz">
      <div className="matriz-cabecera">
        <span>
          <b>{incluidas.length}</b> de {combinaciones.length} {combinaciones.length === 1 ? 'combinación' : 'combinaciones'} se crearán
        </span>
        {/* Las filas no se agregan aquí: salen de los valores de los atributos */}
        <span className="muted" style={{ fontSize: 11.5 }}>
          {combinaciones.length === 1
            ? 'Añade más valores a los atributos para generar más variantes'
            : 'Destilda las que no existan'}
        </span>
      </div>

      {/* Con muchas combinaciones, quitar una a una es inviable: 3 atributos de
          3 valores son 27 filas y quizá solo existan 12. Estos atajos actúan
          sobre grupos enteros, y se combinan entre sí. */}
      {combinaciones.length > 1 && (
        <div className="matriz-atajos">
          <div className="matriz-atajos-globales">
            <button type="button" className="btn btn-sm" onClick={() => onIncluirVarias(todasClaves, true)}
              disabled={descartadas.length === 0}>
              <CheckSquare size={13} /> Todas
            </button>
            <button type="button" className="btn btn-sm" onClick={() => onIncluirVarias(todasClaves, false)}
              disabled={incluidas.length === 0}>
              <Square size={13} /> Ninguna
            </button>
          </div>

          <div className="matriz-atajos-valores">
            {porValor.map((v) => {
              const activas = v.claves.filter((k) => filas[k]?.incluida !== false).length
              const estado = activas === 0 ? 'ninguna' : activas === v.claves.length ? 'todas' : 'parcial'
              return (
                <button
                  key={`${v.nombre}=${v.valor}`}
                  type="button"
                  className="matriz-chip"
                  data-estado={estado}
                  title={`${activas} de ${v.claves.length} con ${v.nombre} ${v.valor} · pulsa para ${estado === 'todas' ? 'quitarlas' : 'marcarlas'}`}
                  onClick={() => onIncluirVarias(v.claves, estado !== 'todas')}
                >
                  {v.valor}
                  <span className="matriz-chip-conteo">{activas}/{v.claves.length}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Escritorio: tabla desplazable, solo con lo que se va a crear */}
      <div className="matriz-scroll">
        <table className="tbl matriz-tabla">
          <thead>
            <tr>
              <th style={{ width: 34 }} />
              <th className="col-id">Variante</th>
              {COLUMNAS.map((c) => (
                <th key={c.campo} className="num" style={{ width: c.ancho }}>
                  <div className="matriz-th">
                    <span>{c.etiqueta}</span>
                    {PROPAGABLES.includes(c.campo) && (
                      <button type="button" className="icon-btn" title={`Aplicar el valor base a todas las variantes`}
                        onClick={() => onPropagar(c.campo)}>
                        <CopyCheck size={13} />
                      </button>
                    )}
                  </div>
                </th>
              ))}
              <th style={{ width: 110 }}>Imágenes</th>
            </tr>
          </thead>
          <tbody>
            {incluidas.map((combo) => (
              <FilaMatriz
                key={combo.clave}
                combo={combo}
                nombre={nombreDeCombinacion(nombreBase, combo)}
                fila={filas[combo.clave]}
                errores={errores?.[combo.clave]}
                onCampo={onCampo}
                onIncluida={onIncluida}
                imagenes={imagenes[combo.clave]}
                onAbrirImagenes={onAbrirImagenes}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Móvil: una tarjeta plegable por variante */}
      <div className="matriz-tarjetas">
        {incluidas.map((combo) => (
          <TarjetaVariante
            key={combo.clave}
            combo={combo}
            nombre={nombreDeCombinacion(nombreBase, combo)}
            fila={filas[combo.clave]}
            errores={errores?.[combo.clave]}
            abierta={abiertas.has(combo.clave)}
            onAlternar={onAlternar}
            onCampo={onCampo}
            onIncluida={onIncluida}
            imagenes={imagenes[combo.clave]}
            onAbrirImagenes={onAbrirImagenes}
          />
        ))}
      </div>

      {incluidas.length === 0 && (
        <div className="empty" style={{ padding: 28 }}>
          <span className="muted" style={{ fontSize: 12.5 }}>
            Ninguna combinación marcada. Marca al menos una para poder crear.
          </span>
        </div>
      )}

      {/* Lo descartado sale de la tabla y queda plegado abajo: la lista de arriba
          es lo que existe, no una mezcla de lo real y lo que nunca se vendió. */}
      {descartadas.length > 0 && (
        <div className="matriz-descartadas">
          {/* El plegado y "restaurar todas" van como hermanos: un botón dentro
              de otro botón es HTML inválido y deja el segundo sin teclado. */}
          <div className="matriz-descartadas-head">
            <button type="button" className="matriz-descartadas-toggle" onClick={() => setVerDescartadas((v) => !v)}
              aria-expanded={verDescartadas}>
              {verDescartadas ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <span>{descartadas.length} {descartadas.length === 1 ? 'combinación no se creará' : 'combinaciones no se crearán'}</span>
            </button>
            <button type="button" className="matriz-descartadas-accion"
              onClick={() => onIncluirVarias(descartadas.map((c) => c.clave), true)}>
              Restaurar todas
            </button>
          </div>

          {verDescartadas && (
            <ul className="matriz-descartadas-lista">
              {descartadas.map((combo) => (
                <li key={combo.clave}>
                  <span>{nombreDeCombinacion(nombreBase, combo)}</span>
                  <button type="button" className="btn btn-sm" onClick={() => onIncluida(combo.clave, true)}>
                    <RotateCcw size={12} /> Restaurar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

interface FilaProps {
  combo: Combinacion
  nombre: string
  fila?: FilaVariante
  errores?: Partial<Record<CampoFila, string>>
  onCampo: (clave: string, campo: CampoFila, valor: string) => void
  onIncluida: (clave: string, incluida: boolean) => void
  imagenes?: ImagenesDeVariante
  onAbrirImagenes: (clave: string) => void
}

/** Resumen de las imágenes de una fila; abre su selector. */
function BotonImagenes({ clave, imagenes, deshabilitado, onAbrir }: {
  clave: string
  imagenes?: ImagenesDeVariante
  deshabilitado: boolean
  onAbrir: (clave: string) => void
}) {
  const cuantas = imagenes?.archivos.length ?? 0
  const copia = !!imagenes?.mismasQue

  return (
    <button type="button" className="btn btn-sm img-boton" disabled={deshabilitado}
      onClick={() => onAbrir(clave)} data-vacio={!cuantas && !copia || undefined}>
      {copia ? <Copy size={13} /> : <ImagePlus size={13} />}
      {copia ? 'Copiadas' : cuantas > 0 ? `${cuantas} ${cuantas === 1 ? 'foto' : 'fotos'}` : 'Agregar'}
    </button>
  )
}

/**
 * Memoizada a propósito: con tres atributos de tres valores son 27 filas por
 * siete campos, casi 200 inputs. Sin esto cada tecla repintaría la matriz entera.
 */
const FilaMatriz = memo(function FilaMatriz({
  combo, nombre, fila, errores, onCampo, onIncluida, imagenes, onAbrirImagenes,
}: FilaProps) {
  const cambiar = useCallback(
    (campo: CampoFila, valor: string) => onCampo(combo.clave, campo, valor),
    [combo.clave, onCampo],
  )

  if (!fila) return null
  const apagada = !fila.incluida

  return (
    <tr data-excluida={apagada || undefined}>
      <td>
        <input type="checkbox" checked={fila.incluida} aria-label={`Incluir ${nombre}`}
          onChange={(e) => onIncluida(combo.clave, e.target.checked)} />
      </td>
      <td className="col-id">
        <div style={{ fontWeight: 500 }}>{nombre}</div>
        <div className="muted" style={{ fontSize: 11 }}>
          {combo.atributos.map((a) => `${a.nombre}: ${a.valor}`).join(' · ')}
        </div>
      </td>
      {COLUMNAS.map((c) => (
        <td key={c.campo} className="num">
          <CampoMatriz campo={c.campo} prefijo={c.prefijo} valor={fila[c.campo]}
            deshabilitado={apagada} error={errores?.[c.campo]} onChange={cambiar} />
        </td>
      ))}
      <td>
        <BotonImagenes clave={combo.clave} imagenes={imagenes} deshabilitado={apagada} onAbrir={onAbrirImagenes} />
      </td>
    </tr>
  )
})

const TarjetaVariante = memo(function TarjetaVariante({
  combo, nombre, fila, errores, abierta, onAlternar, onCampo, onIncluida, imagenes, onAbrirImagenes,
}: FilaProps & { abierta: boolean; onAlternar: (clave: string) => void }) {
  const cambiar = useCallback(
    (campo: CampoFila, valor: string) => onCampo(combo.clave, campo, valor),
    [combo.clave, onCampo],
  )

  if (!fila) return null
  const conError = errores && Object.keys(errores).length > 0

  return (
    <div className="matriz-tarjeta" data-excluida={!fila.incluida || undefined} data-error={conError || undefined}>
      <div className="matriz-tarjeta-head">
        <input type="checkbox" checked={fila.incluida} aria-label={`Incluir ${nombre}`}
          onChange={(e) => onIncluida(combo.clave, e.target.checked)} />
        <button type="button" className="matriz-tarjeta-titulo" onClick={() => onAlternar(combo.clave)}
          aria-expanded={abierta}>
          <div>
            <div style={{ fontWeight: 500 }}>{nombre}</div>
            <div className="muted" style={{ fontSize: 11 }}>
              {fila.sku || 'Sin SKU'} · {fila.precio_venta ? `Q${fila.precio_venta}` : 'sin precio'} · {fila.stock || 0} u.
            </div>
          </div>
          {abierta ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>

      {abierta && (
        <div className="matriz-tarjeta-campos">
          {COLUMNAS.map((c) => (
            <label key={c.campo} className="form-field">
              <span>{c.etiqueta}</span>
              <CampoMatriz campo={c.campo} prefijo={c.prefijo} valor={fila[c.campo]}
                deshabilitado={!fila.incluida} error={errores?.[c.campo]} onChange={cambiar} />
            </label>
          ))}
          <div className="form-field" style={{ gridColumn: '1 / -1' }}>
            <span>Imágenes</span>
            <BotonImagenes clave={combo.clave} imagenes={imagenes}
              deshabilitado={!fila.incluida} onAbrir={onAbrirImagenes} />
          </div>
        </div>
      )}
    </div>
  )
})

function CampoMatriz({ campo, prefijo, valor, deshabilitado, error, onChange }: {
  campo: CampoFila
  prefijo?: string
  valor: string
  deshabilitado: boolean
  error?: string
  onChange: (campo: CampoFila, valor: string) => void
}) {
  const numerico = campo !== 'sku' && campo !== 'codigo_barras'

  return (
    <div className="matriz-campo" data-prefijo={prefijo || undefined} data-texto={!numerico || undefined}>
      <input
        className="form-input"
        type={numerico ? 'number' : 'text'}
        min={numerico ? 0 : undefined}
        step={campo.startsWith('precio') ? '0.01' : undefined}
        value={valor}
        disabled={deshabilitado}
        aria-invalid={!!error}
        title={error}
        onChange={(e) => onChange(campo, e.target.value)}
      />
      {error && <span className="matriz-error" title={error}>{error}</span>}
    </div>
  )
}
