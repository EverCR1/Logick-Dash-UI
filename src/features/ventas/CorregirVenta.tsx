import { useState, useEffect, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { Loader2, Search, X } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { ventasApi } from '@/lib/api'
import { useDebounce } from '@/lib/hooks'
import type { ClienteBusqueda, Venta } from '@/types/venta'

/**
 * Corrige lo único que se puede tocar de una venta emitida: a quién se le
 * atribuye y sus observaciones.
 *
 * Los ítems, importes, método de pago y fechas son inmutables porque de ellos
 * salen el ingreso, la ganancia y los movimientos de inventario ya reportados.
 * Estos dos campos no entran en ningún cálculo, así que corregirlos no reescribe
 * ninguna cifra pasada. Si la venta era a crédito, el crédito sigue al cliente.
 */
export function CorregirVenta({ venta, onClose }: { venta: Venta | null; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [cliente, setCliente] = useState<{ id: number; nombre: string } | null>(null)
  const [observaciones, setObservaciones] = useState('')

  useEffect(() => {
    if (!venta) return
    setCliente(venta.cliente ? { id: venta.cliente.id, nombre: venta.cliente.nombre } : null)
    setObservaciones(venta.observaciones ?? '')
  }, [venta])

  const guardar = useMutation({
    mutationFn: () => ventasApi.corregir(venta!.id, {
      cliente_id: cliente?.id ?? null,
      observaciones: observaciones.trim() || null,
    }),
    onSuccess: () => {
      toast.success('Datos corregidos')
      // Cambia la atribución, que alimenta el reporte de clientes y la cartera
      for (const key of [['ventas'], ['venta'], ['creditos'], ['rep-clientes']]) {
        queryClient.invalidateQueries({ queryKey: key })
      }
      onClose()
    },
    onError: (err) => {
      if (isAxiosError(err) && err.response?.status === 422) {
        toast.error(err.response.data?.message ?? 'No se pudo corregir')
      } else toast.error('No se pudo corregir la venta')
    },
  })

  const onSubmit = (ev: FormEvent) => { ev.preventDefault(); guardar.mutate() }

  if (!venta) return null

  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title={`Corregir ${venta.numero_venta}`}
      footer={<>
        <button type="button" className="btn" onClick={onClose} disabled={guardar.isPending}>Cancelar</button>
        <button type="submit" form="corregir-venta" className="btn btn-primary" disabled={guardar.isPending}>
          {guardar.isPending && <Loader2 size={14} className="spin" />}Guardar
        </button>
      </>}>
      <form id="corregir-venta" onSubmit={onSubmit} className="form-grid">
        <div className="form-field col-2">
          <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.55, margin: 0 }}>
            Solo se pueden corregir el cliente y las observaciones. Los ítems e importes
            de una venta emitida no se modifican: si están mal, cancélala y registra una nueva.
          </p>
        </div>

        <div className="form-field col-2">
          <label>Cliente</label>
          <SelectorCliente cliente={cliente} onSelect={setCliente} />
          {venta.metodo_pago === 'credito' && (
            <span className="form-hint">El crédito de esta venta pasará al mismo cliente.</span>
          )}
        </div>

        <div className="form-field col-2">
          <label>Observaciones</label>
          <textarea className="form-textarea" value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)} />
        </div>
      </form>
    </Modal>
  )
}

function SelectorCliente({ cliente, onSelect }: {
  cliente: { id: number; nombre: string } | null
  onSelect: (c: { id: number; nombre: string } | null) => void
}) {
  const [texto, setTexto] = useState('')
  const reposado = useDebounce(texto)

  const { data: resultados = [], isFetching } = useQuery({
    queryKey: ['venta-clientes', reposado],
    queryFn: () => ventasApi.buscarClientes(reposado),
    enabled: reposado.trim().length >= 2 && !cliente,
  })

  if (cliente) {
    return (
      <div className="venta-elegida">
        <strong style={{ minWidth: 0 }}>{cliente.nombre}</strong>
        <button type="button" className="icon-btn" title="Quitar el cliente" onClick={() => onSelect(null)}>
          <X size={14} />
        </button>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative' }}>
      <div className="toolbar-search">
        <Search size={15} />
        <input placeholder="Buscar por nombre, NIT o teléfono…" value={texto}
          onChange={(e) => setTexto(e.target.value)} />
        {isFetching && <Loader2 size={14} className="spin" style={{ color: 'var(--text-faint)' }} />}
      </div>
      {reposado.trim().length >= 2 && (
        <div className="venta-resultados">
          {resultados.length === 0 ? (
            <div className="muted" style={{ padding: '8px 10px', fontSize: 12 }}>
              {isFetching ? 'Buscando…' : 'Sin clientes que coincidan'}
            </div>
          ) : resultados.map((c: ClienteBusqueda) => (
            <button key={c.id} type="button" className="venta-dropdown-item"
              onClick={() => { onSelect({ id: c.id, nombre: c.nombre }); setTexto('') }}>
              <span style={{ fontWeight: 500 }}>{c.nombre}</span>
              <span className="muted" style={{ fontSize: 11.5 }}>{c.nit || 'C/F'}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
