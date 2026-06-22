export const q = (n: number) => `Q ${Number(n).toLocaleString('es-GT', { minimumFractionDigits: 2 })}`

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
