/** Minúsculas y sin tildes, para comparar texto escrito por el usuario. */
export function normalizarTexto(texto: string | null | undefined): string {
  return (texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/**
 * Raíz de la palabra para tolerar género y plural: "roja" → "roj", que casa con
 * Rojo, Roja, Rojos y Rojas. Solo recorta la vocal final en palabras de 4+
 * letras, para no destruir términos cortos ni códigos.
 */
function raizDePalabra(palabra: string): string {
  return palabra.length >= 4 && /[oa]$/.test(palabra) ? palabra.slice(0, -1) : palabra
}

/**
 * Réplica en cliente del algoritmo de búsqueda del backend
 * (App\Models\Concerns\BuscaPorPalabras), para las listas que se filtran en
 * memoria: selectores de formularios, árbol de categorías, paleta de comandos.
 *
 * Cada palabra del texto buscado debe aparecer en alguno de los campos, sin
 * importar el orden ni que la coincidencia sea exacta.
 * Ej: "cable impresora" encuentra "Cable USB para Impresora".
 *
 * Texto vacío = sin filtro, devuelve true.
 */
export function coincideBusqueda(
  consulta: string | null | undefined,
  ...campos: (string | null | undefined)[]
): boolean {
  const palabras = normalizarTexto(consulta).trim().split(/\s+/).filter(Boolean)
  if (palabras.length === 0) return true

  // El salto de línea separa campos para que una palabra no case a caballo
  // entre el final de uno y el principio del siguiente.
  const texto = campos.map(normalizarTexto).join('\n')

  return palabras.every((p) => texto.includes(raizDePalabra(p)))
}

/** Iniciales a partir de un nombre completo en un solo campo (hasta 2 palabras). */
export function inicialesNombre(nombre: string): string {
  const partes = (nombre ?? '').trim().split(/\s+/)
  return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase() || '#'
}
