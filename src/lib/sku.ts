// Generación automática de SKU a partir del nombre del producto.
// Portado del algoritmo del dashboard Blade (_prod_form_scripts.blade.php).

const VOCALES = 'AEIOU'
const IGNORAR = ['DE', 'DEL', 'EL', 'LA', 'LOS', 'LAS', 'Y', 'E', 'O', 'UN', 'UNA', 'THE', 'OF', 'AND', 'EN', 'A']

function abreviarPalabra(word: string): string {
  // 2-3 letras: se quedan tal cual
  if (word.length <= 3) return word
  // 4+ letras: tomar la inicial + consonantes hasta llegar a 4
  let result = word[0]
  for (let i = 1; i < word.length && result.length < 4; i++) {
    if (VOCALES.indexOf(word[i]) === -1) result += word[i]
  }
  // Si quedó con menos de 3, usar las primeras 3 letras como fallback
  if (result.length < 3) result = word.substring(0, 3)
  return result
}

export function generarSkuDesdeNombre(nombre: string): string {
  const palabras = nombre
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2 && IGNORAR.indexOf(w) === -1)

  if (palabras.length === 0) return ''

  const base = palabras.slice(0, 4).map(abreviarPalabra).join('-')

  // Sufijo numérico solo si hay 1 o 2 palabras relevantes
  return palabras.length <= 2 ? base + '-' + Date.now().toString().slice(-4) : base
}
