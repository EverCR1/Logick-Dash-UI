import { I } from '@/components/icons'
import { fmtN } from '@/lib/format'

export interface PageMeta {
  current_page: number
  last_page: number
  total: number
  from: number | null
  to: number | null
}

interface PaginationProps {
  meta: PageMeta
  page: number
  setPage: (updater: (p: number) => number) => void
}

/**
 * Páginas visibles: siempre la primera y la última, más una ventana alrededor de
 * la actual. Los huecos se colapsan en '…' para que la barra no crezca sin fin.
 */
function paginasVisibles(actual: number, total: number, alrededor = 1): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const paginas = new Set<number>([1, total])
  for (let p = actual - alrededor; p <= actual + alrededor; p++) {
    if (p > 1 && p < total) paginas.add(p)
  }

  const ordenadas = [...paginas].sort((a, b) => a - b)
  const salida: (number | '…')[] = []
  let previa = 0
  for (const p of ordenadas) {
    if (previa && p - previa > 1) salida.push('…')
    salida.push(p)
    previa = p
  }
  return salida
}

export function Pagination({ meta, page, setPage }: PaginationProps) {
  if (meta.last_page <= 1) return null
  const actual = meta.current_page

  return (
    <div className="pagination">
      <span>{meta.from}–{meta.to} de {fmtN(meta.total)}</span>
      <div className="pages">
        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Anterior">
          <I.Chevron style={{ transform: 'rotate(180deg)' }} />
        </button>
        {paginasVisibles(actual, meta.last_page).map((p, i) =>
          p === '…'
            ? <span key={`gap-${i}`} className="pagination-gap">…</span>
            : <button key={p} data-active={p === actual} onClick={() => setPage(() => p)}
                aria-label={`Página ${p}`} aria-current={p === actual ? 'page' : undefined}>{p}</button>
        )}
        <button disabled={page >= meta.last_page} onClick={() => setPage((p) => p + 1)} aria-label="Siguiente">
          <I.Chevron />
        </button>
      </div>
    </div>
  )
}
