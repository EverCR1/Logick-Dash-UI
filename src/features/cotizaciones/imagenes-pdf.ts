import type { Cotizacion, CotizacionDetalle } from '@/types/cotizacion'

/**
 * Convierte las imágenes del catálogo a un formato que el PDF acepte.
 *
 * `@react-pdf/image` solo entiende PNG, JPEG y GIF. Desde la migración a Bunny
 * todas las imágenes del catálogo son WebP, así que pasarle la URL directamente
 * no sirve — y lo hace de la peor forma: no lanza error, descarta la imagen en
 * silencio y produce un PDF con huecos que nadie nota hasta que el cliente lo
 * abre. La salida de aquí son data URLs en JPEG.
 *
 * La conversión la hace el navegador: dibuja la imagen en un canvas y lo
 * exporta. Bunny responde con `Access-Control-Allow-Origin: *`, así que el
 * canvas no queda contaminado y `toDataURL()` puede leerlo.
 */

/** Milisegundos antes de rendirse con una imagen. */
const TIMEOUT = 8000

/** Ancho al que se dibuja. El PDF la muestra a ~34pt, así que sobra para impresión. */
const ANCHO_MAX = 160

/**
 * JPEG y no PNG: son fotos de producto, donde PNG pesa varias veces más sin
 * ganar nada visible. La transparencia no se pierde porque el canvas ya se
 * pinta sobre fondo blanco.
 */
const FORMATO = 'image/jpeg'
const CALIDAD = 0.82

/**
 * URL de la imagen principal de una línea, o null si no le corresponde ninguna.
 *
 * Lo que decide no es el tipo sino la referencia al catálogo: una línea escrita
 * a mano no tiene producto ni servicio detrás, y por tanto no tiene foto.
 */
export function urlDeLinea(d: CotizacionDetalle): string | null {
  const imagenes = d.producto?.imagenes ?? d.servicio?.imagenes ?? []
  if (imagenes.length === 0) return null

  const principal = imagenes.find((i) => 'es_principal' in i && i.es_principal) ?? imagenes[0]
  // El derivado de 400px pesa entre 1 y 15 KB. Usar el original engordaría el
  // PDF varios MB sin que se note en una miniatura.
  return principal.url_thumb || principal.url_medium || principal.url || null
}

/**
 * Descarga una imagen y la devuelve como data URL en PNG.
 *
 * Nunca lanza: si algo falla —red, CORS, formato, o una URL muerta de ImgBB—
 * devuelve null y quien llama pinta el recuadro de "sin imagen". Un PDF no
 * puede caerse porque una foto no cargue.
 */
function convertir(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new window.Image()
    img.crossOrigin = 'anonymous'

    let terminado = false
    const acabar = (valor: string | null) => {
      if (terminado) return
      terminado = true
      clearTimeout(temporizador)
      resolve(valor)
    }

    // Una imagen que nunca resuelve dejaría el PDF colgado para siempre
    const temporizador = setTimeout(() => acabar(null), TIMEOUT)

    img.onload = () => {
      try {
        const escala = Math.min(1, ANCHO_MAX / (img.naturalWidth || ANCHO_MAX))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round((img.naturalWidth || ANCHO_MAX) * escala))
        canvas.height = Math.max(1, Math.round((img.naturalHeight || ANCHO_MAX) * escala))

        const ctx = canvas.getContext('2d')
        if (!ctx) return acabar(null)

        // Fondo blanco antes de dibujar: JPEG no tiene canal alfa, y sin esto
        // las zonas transparentes de un PNG saldrían negras.
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

        acabar(canvas.toDataURL(FORMATO, CALIDAD))
      } catch {
        // toDataURL lanza si el canvas quedó contaminado por falta de CORS
        acabar(null)
      }
    }

    img.onerror = () => acabar(null)
    img.src = url
  })
}

/**
 * Resuelve todas las imágenes de una cotización antes de generar el PDF.
 *
 * Se hace aquí y no dentro del componente a propósito: el documento de
 * react-pdf se renderiza de forma síncrona, así que necesita las imágenes ya
 * convertidas. Además, hacerlo fuera permite que un fallo se convierta en un
 * hueco en la tabla en vez de tumbar la generación entera.
 *
 * @returns id de la línea → data URL. Las que no tienen imagen no aparecen.
 */
export async function resolverImagenes(cotizacion: Cotizacion): Promise<Record<number, string>> {
  const pendientes = cotizacion.detalles
    .map((d) => ({ id: d.id, url: urlDeLinea(d) }))
    .filter((x): x is { id: number; url: string } => x.url !== null)

  if (pendientes.length === 0) return {}

  // Una misma foto puede repetirse entre líneas (variantes que comparten
  // imagen): se convierte una sola vez y se reparte.
  const unicas = [...new Set(pendientes.map((p) => p.url))]
  const convertidas = await Promise.all(unicas.map(convertir))
  const porUrl = new Map(unicas.map((url, i) => [url, convertidas[i]]))

  const mapa: Record<number, string> = {}
  for (const { id, url } of pendientes) {
    const dataUrl = porUrl.get(url)
    if (dataUrl) mapa[id] = dataUrl
  }
  return mapa
}
