export const q = (n: number) => `Q ${Number(n).toLocaleString('es-GT', { minimumFractionDigits: 2 })}`

// Fecha YYYY-MM-DD en hora LOCAL del navegador. NO usar toISOString() (da UTC y
// en zonas al oeste, p. ej. Guatemala UTC−6, por la noche adelanta al día siguiente).
export const fechaLocal = (d: Date = new Date()): string => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const fmtN = (n: number) => Number(n).toLocaleString('es-GT')

export const pct = (n: number) => `${Math.round(n)}%`

// Fecha legible: "14 jun 2026" o "14 jun 2026, 15:42" con hora
export const fmtFecha = (iso: string | null | undefined, conHora = false): string => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  const opts: Intl.DateTimeFormatOptions = conHora
    ? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: 'short', year: 'numeric' }
  return d.toLocaleDateString('es-GT', opts)
}

// Tiempo relativo compacto: "ahora", "hace 5 min", "hace 2 h", "hace 3 d"
export const hace = (iso: string | null | undefined): string => {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const seg = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000))
  if (seg < 60) return 'ahora'
  const min = Math.floor(seg / 60)
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h} h`
  const dias = Math.floor(h / 24)
  if (dias < 7) return `hace ${dias} d`
  return fmtFecha(iso)
}

// Hora legible: "03:42 PM"
export const fmtHora = (iso: string | null | undefined): string => {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', hour12: true })
}
