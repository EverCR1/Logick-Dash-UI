import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { Loader2, Plus, Trash2, X, Search, ShoppingCart } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { ventasApi } from '@/lib/api'
import { useDebounce } from '@/lib/hooks'
import { q } from '@/lib/format'
import { METODO_OPCIONES } from './venta-estados'
import type { ClienteBusqueda, MetodoPago, ResultadoBusqueda, VentaItemPayload } from '@/types/venta'

interface CartItem {
  key: string
  tipo: 'producto' | 'servicio' | 'otro'
  descripcion: string
  precio_unitario: number
  cantidad: number
  descuento: number
  producto_id?: number
  servicio_id?: number
  stock?: number
}

let _seq = 0
const nuevaKey = () => `it-${++_seq}-${Date.now()}`

export function NuevaVenta({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<'producto' | 'servicio'>('producto')
  const [query, setQuery] = useState('')
  const queryDebounced = useDebounce(query)
  const [cart, setCart] = useState<CartItem[]>([])
  const [cliente, setCliente] = useState<ClienteBusqueda | null>(null)
  const [clienteQuery, setClienteQuery] = useState('')
  const clienteQueryDebounced = useDebounce(clienteQuery)
  const [metodo, setMetodo] = useState<MetodoPago>('efectivo')
  const [observaciones, setObservaciones] = useState('')
  const [nombreCredito, setNombreCredito] = useState('')

  useEffect(() => {
    if (open) {
      setTab('producto'); setQuery(''); setCart([]); setCliente(null); setClienteQuery('')
      setMetodo('efectivo'); setObservaciones(''); setNombreCredito('')
    }
  }, [open])

  // Búsqueda de productos/servicios
  const habilitarBusqueda = open && queryDebounced.trim().length >= 1
  const busqueda = useQuery({
    queryKey: ['venta-buscar', tab, queryDebounced],
    queryFn: () => tab === 'producto' ? ventasApi.buscarProductos(queryDebounced) : ventasApi.buscarServicios(queryDebounced),
    enabled: habilitarBusqueda,
    placeholderData: keepPreviousData,
  })

  // Búsqueda de clientes
  const clientesBusqueda = useQuery({
    queryKey: ['venta-clientes', clienteQueryDebounced],
    queryFn: () => ventasApi.buscarClientes(clienteQueryDebounced),
    enabled: open && clienteQueryDebounced.trim().length >= 1 && !cliente,
    placeholderData: keepPreviousData,
  })

  const agregar = (r: ResultadoBusqueda) => {
    setCart((prev) => {
      const idKey = r.tipo === 'producto' ? 'producto_id' : 'servicio_id'
      const existente = prev.find((c) => c[idKey] === r.id && c.tipo === r.tipo)
      if (existente) {
        if (r.tipo === 'producto' && existente.stock != null && existente.cantidad >= existente.stock) {
          toast.error(`Sin más stock de "${r.nombre}"`)
          return prev
        }
        return prev.map((c) => c === existente ? { ...c, cantidad: c.cantidad + 1 } : c)
      }
      return [...prev, {
        key: nuevaKey(), tipo: r.tipo, descripcion: r.nombre, precio_unitario: Number(r.precio) || 0,
        cantidad: 1, descuento: 0,
        ...(r.tipo === 'producto' ? { producto_id: r.id, stock: r.stock } : { servicio_id: r.id }),
      }]
    })
  }

  const agregarCustom = () => setCart((prev) => [...prev, { key: nuevaKey(), tipo: 'otro', descripcion: '', precio_unitario: 0, cantidad: 1, descuento: 0 }])
  const actualizar = (key: string, patch: Partial<CartItem>) => setCart((prev) => prev.map((c) => c.key === key ? { ...c, ...patch } : c))
  const quitar = (key: string) => setCart((prev) => prev.filter((c) => c.key !== key))

  const totales = useMemo(() => {
    const subtotal = cart.reduce((s, c) => s + c.precio_unitario * c.cantidad, 0)
    const descuento = cart.reduce((s, c) => s + (c.descuento || 0), 0)
    return { subtotal, descuento, total: subtotal - descuento }
  }, [cart])

  const guardar = useMutation({
    mutationFn: () => {
      const items: VentaItemPayload[] = cart.map((c) => ({
        tipo: c.tipo, cantidad: c.cantidad, descripcion: c.descripcion.trim(),
        precio_unitario: c.precio_unitario, descuento: c.descuento || 0,
        producto_id: c.producto_id ?? null, servicio_id: c.servicio_id ?? null,
      }))
      return ventasApi.crear({
        items, cliente_id: cliente?.id ?? null, metodo_pago: metodo,
        observaciones: observaciones.trim() || null,
        nombre_cliente_credito: metodo === 'credito' && !cliente ? (nombreCredito.trim() || null) : null,
      })
    },
    onSuccess: (venta) => {
      toast.success(`Venta ${venta.numero_venta} registrada`)
      queryClient.invalidateQueries({ queryKey: ['ventas'] })
      onClose()
    },
    onError: (err) => {
      if (isAxiosError(err) && err.response?.status === 422) toast.error(err.response.data?.message ?? 'Revisa los items de la venta')
      else toast.error('No se pudo registrar la venta')
    },
  })

  const submit = () => {
    if (cart.length === 0) { toast.error('Agrega al menos un item'); return }
    for (const c of cart) {
      if (!c.descripcion.trim()) { toast.error('Todos los items necesitan descripción'); return }
      if (c.precio_unitario < 0 || c.cantidad < 1) { toast.error('Revisa precios y cantidades'); return }
      if (c.descuento > c.precio_unitario * c.cantidad) { toast.error(`El descuento de "${c.descripcion}" supera su subtotal`); return }
    }
    guardar.mutate()
  }

  const resultados = busqueda.data ?? []

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} size="lg" title="Nueva venta"
      footer={<>
        <button type="button" className="btn" onClick={onClose} disabled={guardar.isPending}>Cancelar</button>
        <button type="button" className="btn btn-primary" onClick={submit} disabled={guardar.isPending || cart.length === 0}>
          {guardar.isPending && <Loader2 size={14} className="spin" />}Registrar venta · {q(totales.total)}
        </button>
      </>}>
      <div className="pos-grid">
        {/* ── Buscador ─────────────────────────────── */}
        <div style={{ display: 'grid', gap: 10, alignContent: 'start' }}>
          <div className="tabs">
            <button className="tab" data-active={tab === 'producto'} onClick={() => setTab('producto')}>Productos</button>
            <button className="tab" data-active={tab === 'servicio'} onClick={() => setTab('servicio')}>Servicios</button>
          </div>
          <div className="toolbar-search" style={{ width: '100%' }}>
            <Search size={15} />
            <input placeholder={`Buscar ${tab === 'producto' ? 'productos' : 'servicios'}…`} value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
            {busqueda.isFetching && <Loader2 size={14} className="spin" style={{ color: 'var(--text-faint)' }} />}
          </div>

          <div style={{ display: 'grid', gap: 6, maxHeight: 360, overflowY: 'auto' }}>
            {!habilitarBusqueda ? (
              <div className="muted" style={{ fontSize: 12.5, padding: '16px 4px' }}>Escribe para buscar {tab === 'producto' ? 'productos' : 'servicios'}.</div>
            ) : resultados.length === 0 && !busqueda.isFetching ? (
              <div className="muted" style={{ fontSize: 12.5, padding: '16px 4px' }}>Sin resultados.</div>
            ) : (
              resultados.map((r) => (
                <button key={`${r.tipo}-${r.id}`} className="card" onClick={() => agregar(r)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, textAlign: 'left', cursor: 'pointer', border: '1px solid var(--border)' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.nombre}</div>
                    <div className="muted" style={{ fontSize: 11 }}>
                      {r.sku ?? r.codigo}{r.tipo === 'producto' && r.stock != null ? ` · stock ${r.stock}` : ''}
                    </div>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 12.5 }}>{q(r.precio)}</div>
                  <Plus size={15} style={{ color: 'var(--accent)' }} />
                </button>
              ))
            )}
          </div>
          <button className="btn" onClick={agregarCustom}><Plus size={14} /> Item personalizado</button>
        </div>

        {/* ── Carrito + datos ──────────────────────── */}
        <div style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
          {cart.length === 0 ? (
            <div className="empty" style={{ padding: 40 }}><ShoppingCart size={26} /><div style={{ fontSize: 12.5 }}>Carrito vacío</div></div>
          ) : (
            <div style={{ display: 'grid', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
              {cart.map((c) => (
                <div key={c.key} className="card" style={{ padding: 10, display: 'grid', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {c.tipo === 'otro' ? (
                      <input className="form-input" style={{ flex: 1 }} placeholder="Descripción" value={c.descripcion} onChange={(e) => actualizar(c.key, { descripcion: e.target.value })} />
                    ) : (
                      <div style={{ flex: 1, fontSize: 12.5, fontWeight: 600 }}>{c.descripcion}</div>
                    )}
                    <button className="icon-btn danger" title="Quitar" onClick={() => quitar(c.key)}><Trash2 size={14} /></button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                    <Campo label="Precio">
                      <input className="form-input" type="number" min="0" step="0.01" value={c.precio_unitario}
                        disabled={c.tipo !== 'otro'} onChange={(e) => actualizar(c.key, { precio_unitario: Number(e.target.value) })} />
                    </Campo>
                    <Campo label="Cant.">
                      <input className="form-input" type="number" min="1" max={c.stock} value={c.cantidad}
                        onChange={(e) => {
                          let n = Math.max(1, Math.floor(Number(e.target.value) || 1))
                          if (c.stock != null && n > c.stock) { n = c.stock; toast.error(`Stock máximo: ${c.stock}`) }
                          actualizar(c.key, { cantidad: n })
                        }} />
                    </Campo>
                    <Campo label="Desc.">
                      <input className="form-input" type="number" min="0" step="0.01" value={c.descuento}
                        onChange={(e) => actualizar(c.key, { descuento: Math.max(0, Number(e.target.value) || 0) })} />
                    </Campo>
                  </div>
                  <div className="muted" style={{ fontSize: 11.5, textAlign: 'right' }}>Subtotal: {q(c.precio_unitario * c.cantidad - (c.descuento || 0))}</div>
                </div>
              ))}
            </div>
          )}

          {/* Cliente */}
          <div className="form-field" style={{ marginBottom: 0, position: 'relative' }}>
            <label>Cliente</label>
            {cliente ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--surface-2)', borderRadius: 8 }}>
                <div style={{ flex: 1, fontSize: 12.5 }}>{cliente.nombre}{cliente.nit ? <span className="muted"> · {cliente.nit}</span> : ''}</div>
                <button className="icon-btn" title="Quitar cliente" onClick={() => { setCliente(null); setClienteQuery('') }}><X size={14} /></button>
              </div>
            ) : (
              <>
                <input className="form-input" placeholder="Buscar cliente (opcional)…" value={clienteQuery} onChange={(e) => setClienteQuery(e.target.value)} />
                {clienteQueryDebounced.trim().length >= 1 && (clientesBusqueda.data?.length ?? 0) > 0 && (
                  <div className="card" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, marginTop: 4, maxHeight: 180, overflowY: 'auto', padding: 4 }}>
                    {clientesBusqueda.data!.map((cl) => (
                      <button key={cl.id} className="nav-item" style={{ width: '100%', textAlign: 'left', fontSize: 12.5 }}
                        onClick={() => { setCliente(cl); setClienteQuery('') }}>
                        {cl.nombre}{cl.nit ? <span className="muted"> · {cl.nit}</span> : ''}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Método de pago */}
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label>Método de pago</label>
            <Select value={metodo} onValueChange={(v) => setMetodo(v as MetodoPago)} options={METODO_OPCIONES} />
          </div>

          {metodo === 'credito' && !cliente && (
            <div className="form-field" style={{ marginBottom: 0 }}>
              <label>Nombre del cliente (crédito)</label>
              <input className="form-input" value={nombreCredito} onChange={(e) => setNombreCredito(e.target.value)} placeholder="Para registrar el crédito" />
            </div>
          )}

          <div className="form-field" style={{ marginBottom: 0 }}>
            <label>Observaciones</label>
            <textarea className="form-textarea" rows={2} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Opcional" />
          </div>

          {/* Totales */}
          <div style={{ display: 'grid', gap: 4, fontSize: 12.5, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="muted">Subtotal</span><span className="tnum">{q(totales.subtotal)}</span></div>
            {totales.descuento > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="muted">Descuento</span><span className="tnum">- {q(totales.descuento)}</span></div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 15 }}><span>Total</span><span className="tnum">{q(totales.total)}</span></div>
            {metodo === 'credito' && <div className="muted" style={{ fontSize: 11 }}>La venta quedará <strong>pendiente</strong> y se creará un crédito por el total.</div>}
          </div>
        </div>
      </div>
    </Modal>
  )
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'grid', gap: 2 }}>
      <span className="muted" style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.04em', fontWeight: 600 }}>{label}</span>
      {children}
    </label>
  )
}
