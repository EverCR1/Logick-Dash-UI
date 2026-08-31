import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, Minus, Plus } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { productosApi } from '@/lib/api'
import { invalidarProductos } from '@/lib/cache'
import type { Producto } from '@/types/producto'

export function AjustarStock({ open, onClose, producto }: {
  open: boolean; onClose: () => void; producto: Producto | null
}) {
  const queryClient = useQueryClient()
  const [valor, setValor] = useState(0)

  useEffect(() => { if (open && producto) setValor(producto.stock) }, [open, producto])

  const guardar = useMutation({
    mutationFn: () => productosApi.ajustarStock(producto!.id, valor),
    onSuccess: () => {
      toast.success('Stock actualizado')
      invalidarProductos(queryClient)
      onClose()
    },
    onError: () => toast.error('No se pudo actualizar el stock'),
  })

  if (!producto) return null

  const actual = producto.stock
  const delta = valor - actual
  const setSeguro = (n: number) => setValor(Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0)

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} title="Ajustar stock" description={`${producto.nombre} · ${producto.sku}`}
      footer={<>
        <button type="button" className="btn" onClick={onClose} disabled={guardar.isPending}>Cancelar</button>
        <button type="button" className="btn btn-primary" onClick={() => guardar.mutate()} disabled={guardar.isPending || delta === 0}>
          {guardar.isPending && <Loader2 size={14} className="spin" />} Guardar
        </button>
      </>}>
      <div className="stock-adjust">
        <div className="stock-adjust-cur">
          <span className="muted">Stock actual:</span><b className="tnum">{actual}</b>
        </div>

        <div className="stock-stepper">
          <button type="button" className="stock-step-btn" onClick={() => setSeguro(valor - 1)} disabled={valor <= 0} aria-label="Quitar uno"><Minus size={18} /></button>
          <input className="form-input" type="number" min={0} value={valor}
            onChange={(e) => setSeguro(Number(e.target.value))}
            onFocus={(e) => e.target.select()} />
          <button type="button" className="stock-step-btn" onClick={() => setSeguro(valor + 1)} aria-label="Agregar uno"><Plus size={18} /></button>
        </div>

        <div className="stock-adjust-delta">
          {delta === 0
            ? <span className="muted">Sin cambios</span>
            : <span style={{ color: delta > 0 ? 'var(--pos)' : 'var(--neg)', fontWeight: 600 }}>
                {delta > 0 ? `+${delta}` : delta} unidad{Math.abs(delta) === 1 ? '' : 'es'} → nuevo stock {valor}
              </span>}
        </div>
      </div>
    </Modal>
  )
}
