import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import * as Dialog from '@radix-ui/react-dialog'
import { Search } from 'lucide-react'
import { I, type IconName } from '@/components/icons'
import { NAV } from '@/config/nav'

interface Entrada {
  to: string
  label: string
  icon: IconName
  grupo: string
}

// Aplana la navegación en una lista buscable con su grupo de origen
const ENTRADAS: Entrada[] = NAV.flatMap((e) =>
  'type' in e
    ? e.items.map((it) => ({ to: it.to, label: it.label, icon: it.icon, grupo: e.label }))
    : [{ to: e.to, label: e.label, icon: e.icon, grupo: 'General' }],
)

function normaliza(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [activo, setActivo] = useState(0)
  const listaRef = useRef<HTMLDivElement>(null)

  useEffect(() => { if (open) { setQuery(''); setActivo(0) } }, [open])

  const resultados = useMemo(() => {
    const q = normaliza(query.trim())
    if (!q) return ENTRADAS
    return ENTRADAS.filter((e) => normaliza(e.label).includes(q) || normaliza(e.grupo).includes(q))
  }, [query])

  useEffect(() => { setActivo(0) }, [query])

  const ir = (to: string) => { onOpenChange(false); navigate(to) }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActivo((a) => Math.min(a + 1, resultados.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActivo((a) => Math.max(a - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); if (resultados[activo]) ir(resultados[activo].to) }
  }

  // Mantiene el item activo visible al navegar con flechas
  useEffect(() => {
    const el = listaRef.current?.querySelector<HTMLElement>(`[data-idx="${activo}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [activo])

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="ui-overlay" />
        <Dialog.Content className="cmdk" aria-label="Búsqueda rápida" onKeyDown={onKeyDown}>
          <Dialog.Title className="sr-only">Búsqueda rápida</Dialog.Title>
          <div className="cmdk-search">
            <Search size={16} />
            <input autoFocus placeholder="Ir a un módulo…" value={query} onChange={(e) => setQuery(e.target.value)} />
            <span className="kbd">esc</span>
          </div>
          <div className="cmdk-list" ref={listaRef}>
            {resultados.length === 0 ? (
              <div className="cmdk-empty">Sin coincidencias</div>
            ) : (
              resultados.map((r, i) => {
                const Icono = I[r.icon]
                return (
                  <button key={r.to} data-idx={i} className="cmdk-item" data-active={i === activo}
                    onMouseEnter={() => setActivo(i)} onClick={() => ir(r.to)}>
                    <Icono size={15} />
                    <span className="cmdk-item-label">{r.label}</span>
                    <span className="cmdk-item-grupo">{r.grupo}</span>
                  </button>
                )
              })
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
