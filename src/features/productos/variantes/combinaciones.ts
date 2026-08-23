import type { ProductoAtributo } from '@/types/producto'

/**
 * Un atributo que varía: su nombre y todos los valores que puede tomar.
 * "Capacidad" con 128GB, 256GB y 512GB es un eje de tres valores.
 */
export interface Eje {
  nombre: string
  valores: string[]
}

/** Una combinación concreta: un valor por cada eje. */
export interface Combinacion {
  /** Clave estable para conservar lo editado cuando cambian los ejes. */
  clave: string
  atributos: ProductoAtributo[]
}

/** Ejes cuyo valor va a la columna `color` y no a `producto_atributos`. */
const EJE_COLOR = 'color'

/** El backend reemplaza el nombre de estos atributos por "de": "USB de 64GB". */
const PALABRAS_DE = ['capacidad', 'cantidad', 'material']

export const esEjeColor = (nombre: string) => nombre.trim().toLowerCase() === EJE_COLOR

/** Ejes utilizables: con nombre y al menos un valor. */
export function ejesValidos(ejes: Eje[]): Eje[] {
  return ejes
    .map((e) => ({ nombre: e.nombre.trim(), valores: e.valores.map((v) => v.trim()).filter(Boolean) }))
    .filter((e) => e.nombre && e.valores.length > 0)
}

/**
 * Producto cartesiano de los ejes: todas las combinaciones posibles.
 *
 * Con Capacidad (128GB, 256GB) y Color (Negro, Blanco) salen cuatro. Crece
 * multiplicando, no sumando: tres ejes de tres valores son 27, no 9.
 */
export function combinaciones(ejes: Eje[]): Combinacion[] {
  const validos = ejesValidos(ejes)
  if (validos.length === 0) return []

  let acumulado: ProductoAtributo[][] = [[]]

  for (const eje of validos) {
    const siguiente: ProductoAtributo[][] = []
    for (const parcial of acumulado) {
      for (const valor of eje.valores) {
        siguiente.push([...parcial, { nombre: eje.nombre, valor }])
      }
    }
    acumulado = siguiente
  }

  return acumulado.map((atributos) => ({ clave: claveDe(atributos), atributos }))
}

/** Cuántas combinaciones saldrían, sin construirlas. */
export function totalCombinaciones(ejes: Eje[]): number {
  return ejesValidos(ejes).reduce((total, eje) => total * eje.valores.length, 1)
}

/** Identifica una combinación sin depender del orden en que se listó. */
function claveDe(atributos: ProductoAtributo[]): string {
  return [...atributos]
    .map((a) => `${a.nombre}=${a.valor}`)
    .sort()
    .join('|')
}

/**
 * Reparte una combinación entre lo que va a la columna `color` y lo que va a
 * `producto_atributos`. La tienda usa `color` para el selector de colores y
 * `nombre_completo` lo pega al final con " - ", así que un eje llamado Color
 * no puede quedarse como un atributo cualquiera.
 */
export function repartir(atributos: ProductoAtributo[]): { color: string | null; atributos: ProductoAtributo[] } {
  const color = atributos.find((a) => esEjeColor(a.nombre))
  return {
    color: color ? color.valor : null,
    atributos: atributos.filter((a) => !esEjeColor(a.nombre)),
  }
}

/**
 * Cómo se verá el nombre del producto. Réplica de
 * `Producto::generarNombreCompleto()`: los atributos se anexan en orden y el
 * color va al final separado por " - ".
 */
export function nombreCompleto(nombreBase: string, atributos: ProductoAtributo[], color: string | null): string {
  const partes = [nombreBase.trim()]

  for (const attr of atributos) {
    const nombre = attr.nombre.trim()
    const valor = attr.valor.trim()
    if (!nombre || !valor) continue
    partes.push(PALABRAS_DE.includes(nombre.toLowerCase()) ? `de ${valor}` : `${nombre} ${valor}`)
  }

  const resultado = partes.join(' ')
  return color?.trim() ? `${resultado} - ${color.trim()}` : resultado
}

/** Nombre completo de una combinación, repartiendo color y atributos. */
export function nombreDeCombinacion(nombreBase: string, combinacion: Combinacion): string {
  const { color, atributos } = repartir(combinacion.atributos)
  return nombreCompleto(nombreBase, atributos, color)
}

const MAX_SKU = 50

/**
 * Abrevia un valor para el SKU. Los que llevan cifras se conservan enteros
 * —"128GB" sin sus dígitos no identifica nada—; los de solo letras se recortan
 * a tres, que es como se escriben a mano: NEG, BLA, ROJ.
 */
function abreviar(valor: string): string {
  const limpio = valor
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')

  if (!limpio) return ''
  return /[0-9]/.test(limpio) ? limpio.slice(0, 6) : limpio.slice(0, 3)
}

/**
 * SKU sugerido para una combinación: el base más un token por eje.
 * Se recorta el base, no los tokens, porque son los que distinguen la variante.
 */
export function skuDeCombinacion(skuBase: string, combinacion: Combinacion): string {
  const tokens = combinacion.atributos.map((a) => abreviar(a.valor)).filter(Boolean)
  const sufijo = tokens.length ? `-${tokens.join('-')}` : ''
  const base = skuBase.trim().toUpperCase()

  return `${base.slice(0, Math.max(0, MAX_SKU - sufijo.length))}${sufijo}`
}

/**
 * SKUs de todas las combinaciones, desempatando los que colisionen.
 *
 * Dos ejes distintos pueden abreviar igual ("Negro" y "Negra" → NEG), y el SKU
 * es único en la base: sin desempate el lote entero sería rechazado.
 */
export function skusDeCombinaciones(skuBase: string, combos: Combinacion[]): Record<string, string> {
  const usados = new Map<string, number>()
  const salida: Record<string, string> = {}

  for (const combo of combos) {
    const sugerido = skuDeCombinacion(skuBase, combo)
    const repeticiones = usados.get(sugerido) ?? 0
    usados.set(sugerido, repeticiones + 1)

    salida[combo.clave] = repeticiones === 0
      ? sugerido
      : `${sugerido.slice(0, MAX_SKU - 2)}-${repeticiones + 1}`
  }

  return salida
}
