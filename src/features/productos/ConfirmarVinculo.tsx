import * as Dialog from '@radix-ui/react-dialog'
import { Loader2, Link2, Layers } from 'lucide-react'
import type { Producto } from '@/types/producto'

export type ModoVinculo = 'solo' | 'fusionar'

/**
 * El candidato ya pertenece a un grupo CON hermanos, así que vincularlo tiene dos
 * resultados posibles y solo el usuario sabe cuál quiere: traerlo solo (estaba mal
 * clasificado) o unir los dos grupos (son el mismo producto). Se pregunta únicamente
 * en ese caso; si el candidato no tiene grupo o está solo en él, no hay ambigüedad.
 */
export function ConfirmarVinculo({ candidato, hermanos, loading, onElegir, onCancelar }: {
  candidato: Producto | null
  hermanos: Producto[]
  loading?: boolean
  onElegir: (modo: ModoVinculo) => void
  onCancelar: () => void
}) {
  if (!candidato) return null

  const nombres = hermanos.map((h) => h.nombre_completo).join(', ')
  const total = hermanos.length + 1

  return (
    <Dialog.Root open onOpenChange={(o) => { if (!o) onCancelar() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="ui-overlay" />
        <Dialog.Content className="ui-confirm" style={{ maxWidth: 470 }}>
          <Dialog.Title className="ui-confirm-title">¿Cómo quieres vincularlo?</Dialog.Title>
          <Dialog.Description className="ui-confirm-desc">
            <b>{candidato.nombre_completo}</b> ya pertenece al grupo{' '}
            <code>{candidato.grupo_variante}</code>, junto con {hermanos.length}{' '}
            {hermanos.length === 1 ? 'producto más' : 'productos más'} ({nombres}).
          </Dialog.Description>

          <div className="vinc-opciones">
            <button type="button" className="vinc-opcion" disabled={loading} onClick={() => onElegir('solo')}>
              <span className="vinc-opcion-ico"><Link2 size={15} /></span>
              <span className="vinc-opcion-txt">
                <span className="vinc-opcion-tit">Vincular solo este producto <span className="badge" data-tone="pos">Recomendado</span></span>
                <span className="vinc-opcion-sub">
                  Se une aquí y sale de su grupo. {nombres} {hermanos.length === 1 ? 'sigue' : 'siguen'} agrupado{hermanos.length === 1 ? '' : 's'} aparte.
                </span>
              </span>
            </button>

            <button type="button" className="vinc-opcion" disabled={loading} onClick={() => onElegir('fusionar')}>
              <span className="vinc-opcion-ico"><Layers size={15} /></span>
              <span className="vinc-opcion-txt">
                <span className="vinc-opcion-tit">Fusionar los dos grupos</span>
                <span className="vinc-opcion-sub">
                  {candidato.nombre_completo} y {nombres} se unen a este grupo ({total} {total === 1 ? 'variante' : 'variantes'} más en total).
                </span>
              </span>
            </button>
          </div>

          <div className="ui-confirm-actions">
            <Dialog.Close asChild>
              <button className="btn" disabled={loading}>Cancelar</button>
            </Dialog.Close>
            {loading && <span className="muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}><Loader2 size={14} className="spin" /> Aplicando…</span>}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
