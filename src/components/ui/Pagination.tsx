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

export function Pagination({ meta, page, setPage }: PaginationProps) {
  if (meta.last_page <= 1) return null
  return (
    <div className="pagination">
      <span>{meta.from}–{meta.to} de {fmtN(meta.total)}</span>
      <div className="pages">
        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Anterior">
          <I.Chevron style={{ transform: 'rotate(180deg)' }} />
        </button>
        <span style={{ padding: '0 6px' }}>Página {meta.current_page} de {meta.last_page}</span>
        <button disabled={page >= meta.last_page} onClick={() => setPage((p) => p + 1)} aria-label="Siguiente">
          <I.Chevron />
        </button>
      </div>
    </div>
  )
}
