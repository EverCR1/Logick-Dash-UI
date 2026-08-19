import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import * as Dialog from '@radix-ui/react-dialog'
import { Search } from 'lucide-react'
import { I, type IconName } from '@/components/icons'
import { NAV, puedeVer } from '@/config/nav'
import { useAuth } from '@/lib/auth'
import { coincideBusqueda } from '@/lib/text'

interface Entrada {
  to: string
  label: string
  icon: IconName
  grupo: string
}

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const rol = usuario?.rol
  const [query, setQuery] = useState('')
  const [activo, setActivo] = useState(0)
  const listaRef = useRef<HTMLDivElement>(null)

  useEffect(() => { if (open) { setQuery(''); setActivo(0) } }, [open])

  // Aplana la navegación visible para el rol en una lista buscable con su grupo de origen
  const entradas = useMemo<Entrada[]>(
    () =>
      NAV.flatMap((e) =>
        'type' in e
          ? e.items.filter((it) => puedeVer(it, rol)).map((it) => ({ to: it.to, label: it.label, icon: it.icon, grupo: e.label }))
          : puedeVer(e, rol)
            ? [{ to: e.to, label: e.label, icon: e.icon, grupo: 'General' }]
            : [],
      ),
    [rol],
  )

  const resultados = useMemo(
    () => entradas.filter((e) => coincideBusqueda(query, e.label, e.grupo)),
    [query, entradas],
  )

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
