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

// Hora legible: "03:42 PM"
export const fmtHora = (iso: string | null | undefined): string => {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', hour12: true })
}
