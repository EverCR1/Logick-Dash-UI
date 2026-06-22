/** Iniciales a partir de un nombre completo en un solo campo (hasta 2 palabras). */
export function inicialesNombre(nombre: string): string {
  const partes = (nombre ?? '').trim().split(/\s+/)
  return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase() || '#'
}
