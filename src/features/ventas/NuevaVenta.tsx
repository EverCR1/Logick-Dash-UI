import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import {
  Loader2, Plus, Minus, Trash2, X, Search, ShoppingCart, ChevronsLeft,
  Banknote, CreditCard, Landmark, Shuffle, Clock, User, Receipt, Package, Boxes, AlertCircle,
} from 'lucide-react'
import { Select } from '@/components/ui/Select'
import { CrearClienteRapido } from './CrearClienteRapido'
import { useAuth } from '@/lib/auth'
import { ventasApi, catalogosApi } from '@/lib/api'
import { useDebounce } from '@/lib/hooks'
import { q } from '@/lib/format'
import { METODO_LABEL } from './venta-estados'
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

const METODOS: { value: MetodoPago; icon: React.ComponentType<{ size?: number }> }[] = [
  { value: 'efectivo', icon: Banknote },
  { value: 'tarjeta', icon: CreditCard },
  { value: 'transferencia', icon: Landmark },
  { value: 'mixto', icon: Shuffle },
  { value: 'credito', icon: Clock },
]

let _seq = 0
const nuevaKey = () => `it-${++_seq}-${Date.now()}`

export default function NuevaVenta() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { usuario } = useAuth()
  const [tab, setTab] = useState<'producto' | 'servicio'>('producto')
  const [query, setQuery] = useState('')
  const queryDebounced = useDebounce(query)
  const [cart, setCart] = useState<CartItem[]>([])
  const [cliente, setCliente] = useState<ClienteBusqueda | null>(null)
  const [clienteQuery, setClienteQuery] = useState('')
  const clienteQueryDebounced = useDebounce(clienteQuery)
  const [metodo, setMetodo] = useState<MetodoPago>('efectivo')
  const [sucursalId, setSucursalId] = useState(() => usuario?.sucursal_id ? String(usuario.sucursal_id) : 'default')
  const [observaciones, setObservaciones] = useState('')
  const [crearCliente, setCrearCliente] = useState(false)

  const { data: sucursales = [] } = useQuery({
    queryKey: ['sucursales-activas'], queryFn: catalogosApi.sucursalesActivas, staleTime: 1000 * 60 * 10,
  })

  // Si el usuario carga después del montaje, preselecciona su sucursal
  useEffect(() => {
    if (usuario?.sucursal_id && sucursalId === 'default') setSucursalId(String(usuario.sucursal_id))
  }, [usuario]) // eslint-disable-line react-hooks/exhaustive-deps

  const habilitarBusqueda = queryDebounced.trim().length >= 1
  const mostrarResultados = query.trim().length >= 1
  const busqueda = useQuery({
    queryKey: ['venta-buscar', tab, queryDebounced],
    queryFn: () => tab === 'producto' ? ventasApi.buscarProductos(queryDebounced) : ventasApi.buscarServicios(queryDebounced),
    enabled: habilitarBusqueda,
    placeholderData: keepPreviousData,
  })

  const clientesBusqueda = useQuery({
    queryKey: ['venta-clientes', clienteQueryDebounced],
    queryFn: () => ventasApi.buscarClientes(clienteQueryDebounced),
    enabled: clienteQueryDebounced.trim().length >= 1 && !cliente,
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
  const cambiarCantidad = (c: CartItem, delta: number) => {
    let n = c.cantidad + delta
    if (n < 1) n = 1
    if (c.stock != null && n > c.stock) { n = c.stock; toast.error(`Stock máximo: ${c.stock}`) }
    actualizar(c.key, { cantidad: n })
  }

  const totales = useMemo(() => {
    const subtotal = cart.reduce((s, c) => s + c.precio_unitario * c.cantidad, 0)
    const descuento = cart.reduce((s, c) => s + (c.descuento || 0), 0)
    const unidades = cart.reduce((s, c) => s + c.cantidad, 0)
    return { subtotal, descuento, total: subtotal - descuento, unidades }
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
        sucursal_id: sucursalId !== 'default' ? Number(sucursalId) : null,
        observaciones: observaciones.trim() || null,
      })
    },
    onSuccess: (venta) => {
      toast.success(`Venta ${venta.numero_venta} registrada`)
      queryClient.invalidateQueries({ queryKey: ['ventas'] })
      navigate('/ventas')
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
    if (metodo === 'credito' && !cliente) { toast.error('Selecciona o crea un cliente arriba para registrar el crédito'); return }
    guardar.mutate()
  }

  const resultados = busqueda.data ?? []

  return (
    <>
      <div className="page-head" style={{ alignItems: 'center' }}>
        <button className="back-link" onClick={() => navigate('/ventas')}><ChevronsLeft /> Ventas</button>
        <div style={{ fontWeight: 600, fontSize: 16 }}>Nueva venta</div>
      </div>

      <div className="venta-create-grid">
        {/* ── Columna principal ─────────────────────────── */}
        <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>

          {/* Información general */}
          <div className="card">
            <div className="card-header"><div className="card-title"><User size={15} style={{ color: 'var(--text-muted)' }} />Información general</div></div>
            <div className="form-grid" style={{ padding: 16 }}>
              {/* Cliente */}
              <div className="form-field col-2" style={{ position: 'relative' }}>
                <label>Cliente <span className="muted" style={{ fontWeight: 400 }}>· opcional</span></label>
                {cliente ? (
                  <div className="venta-cliente-chip">
                    <User size={14} />
                    <span style={{ flex: 1 }}>{cliente.nombre}{cliente.nit ? <span className="muted"> · {cliente.nit}</span> : ''}</span>
                    <button type="button" className="icon-btn" title="Quitar" onClick={() => { setCliente(null); setClienteQuery('') }}><X size={14} /></button>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input className="form-input" style={{ flex: 1 }} placeholder="Buscar cliente por nombre o NIT…" value={clienteQuery} onChange={(e) => setClienteQuery(e.target.value)} />
                      <button type="button" className="btn" title="Crear cliente" onClick={() => setCrearCliente(true)}><Plus size={14} /> Nuevo</button>
                    </div>
                    {clienteQueryDebounced.trim().length >= 1 && (clientesBusqueda.data?.length ?? 0) > 0 && (
                      <div className="venta-dropdown">
                        {clientesBusqueda.data!.map((cl) => (
                          <button key={cl.id} type="button" className="venta-dropdown-item" onClick={() => { setCliente(cl); setClienteQuery('') }}>
                            <span style={{ flex: 1 }}>{cl.nombre}</span>
                            {cl.nit && <span className="muted" style={{ fontSize: 11.5 }}>{cl.nit}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                    <span className="muted" style={{ fontSize: 11, marginTop: 4 }}>Deja vacío para cliente ocasional.</span>
                  </>
                )}
              </div>

              {/* Método de pago */}
              <div className="form-field col-2">
                <label>Método de pago</label>
                <div className="metodo-grid">
                  {METODOS.map(({ value, icon: Icon }) => (
                    <button type="button" key={value} className="metodo-pill" data-on={metodo === value} onClick={() => setMetodo(value)}>
                      <Icon size={16} />
                      <span>{METODO_LABEL[value]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sucursal */}
              <div className="form-field">
                <label>Sucursal</label>
                <Select value={sucursalId} onValueChange={setSucursalId} placeholder="Mi sucursal"
                  options={[{ value: 'default', label: 'Mi sucursal (por defecto)' }, ...sucursales.map((s) => ({ value: String(s.id), label: s.nombre }))]} />
              </div>

              {/* Aviso crédito sin cliente: debe usarse el cliente de arriba */}
              {metodo === 'credito' && !cliente && (
                <div className="form-field col-2 venta-credito-aviso">
                  <AlertCircle size={15} />
                  <span>El crédito se registra a nombre del cliente. <b>Selecciona o crea un cliente</b> arriba.</span>
                </div>
              )}
            </div>
          </div>

          {/* Productos y servicios */}
          <div className="card venta-card-prod">
            <div className="card-header" style={{ justifyContent: 'space-between' }}>
              <div className="card-title"><ShoppingCart size={15} style={{ color: 'var(--text-muted)' }} />Productos y servicios</div>
              {cart.length > 0 && <button className="btn btn-sm" onClick={() => setCart([])}><Trash2 size={13} /> Vaciar</button>}
            </div>
            <div style={{ padding: 16, display: 'grid', gap: 12 }}>
              <div className="venta-buscador">
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <div className="tabs">
                    <button className="tab" data-active={tab === 'producto'} onClick={() => setTab('producto')}>Productos</button>
                    <button className="tab" data-active={tab === 'servicio'} onClick={() => setTab('servicio')}>Servicios</button>
                  </div>
                  <div className="toolbar-search" style={{ flex: 1, minWidth: 200 }}>
                    <Search size={15} />
                    <input placeholder={`Buscar ${tab === 'producto' ? 'productos' : 'servicios'}…`} value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
                    {busqueda.isFetching && <Loader2 size={14} className="spin" style={{ color: 'var(--text-faint)' }} />}
                    {query && <button type="button" className="ts-clear" onClick={() => setQuery('')} aria-label="Limpiar búsqueda"><X size={14} /></button>}
                  </div>
                  <button className="btn" onClick={agregarCustom}><Plus size={14} /> Personalizado</button>
                </div>

                {/* Resultados de búsqueda (dropdown flotante) */}
                {mostrarResultados && (
                  <div className="venta-resultados">
                    {!habilitarBusqueda || busqueda.isFetching ? (
                      <div className="muted" style={{ fontSize: 12.5, padding: '10px 4px' }}>Buscando…</div>
                    ) : resultados.length === 0 ? (
                      <div className="muted" style={{ fontSize: 12.5, padding: '10px 4px' }}>Sin resultados.</div>
                    ) : resultados.map((r) => (
                      <button key={`${r.tipo}-${r.id}`} type="button" className="venta-resultado" onClick={() => { agregar(r); setQuery('') }}>
                        <span className="vr-thumb">
                          {r.imagen ? <img src={r.imagen} alt="" /> : (r.tipo === 'producto' ? <Package size={16} /> : <Boxes size={16} />)}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="vr-nombre">{r.nombre}</div>
                          <div className="muted" style={{ fontSize: 11 }}>{r.sku ?? r.codigo}{r.tipo === 'producto' && r.stock != null ? ` · stock ${r.stock}` : ''}</div>
                        </div>
                        <span style={{ fontWeight: 600, fontSize: 12.5 }}>{q(r.precio)}</span>
                        <Plus size={15} style={{ color: 'var(--accent)' }} />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Items */}
              {cart.length === 0 ? (
                <div className="empty" style={{ padding: 36 }}><ShoppingCart size={26} /><div style={{ fontSize: 12.5 }}>No hay items agregados</div>
                  <div className="muted" style={{ fontSize: 11.5 }}>Busca productos o servicios arriba para agregarlos.</div></div>
              ) : (
                <table className="tbl venta-items">
                  <thead><tr><th>Descripción</th><th className="num" style={{ width: 130 }}>Precio</th><th style={{ width: 116 }}>Cant.</th><th className="num" style={{ width: 100 }}>Desc.</th><th className="num" style={{ width: 120 }}>Subtotal</th><th style={{ width: 40 }} /></tr></thead>
                  <tbody>
                    {cart.map((c) => (
                      <tr key={c.key}>
                        <td>
                          {c.tipo === 'otro'
                            ? <input className="form-input" placeholder="Descripción" value={c.descripcion} onChange={(e) => actualizar(c.key, { descripcion: e.target.value })} />
                            : <span style={{ fontWeight: 500 }}>{c.descripcion}</span>}
                        </td>
                        <td className="num">
                          <input className="form-input ta-r" type="number" min="0" step="0.01" value={c.precio_unitario}
                            onChange={(e) => actualizar(c.key, { precio_unitario: Math.max(0, Number(e.target.value) || 0) })} />
                        </td>
                        <td>
                          <div className="qty-stepper">
                            <button type="button" onClick={() => cambiarCantidad(c, -1)} disabled={c.cantidad <= 1}><Minus size={13} /></button>
                            <input type="number" min="1" max={c.stock} value={c.cantidad}
                              onChange={(e) => { let n = Math.max(1, Math.floor(Number(e.target.value) || 1)); if (c.stock != null && n > c.stock) { n = c.stock; toast.error(`Stock máximo: ${c.stock}`) } actualizar(c.key, { cantidad: n }) }} />
                            <button type="button" onClick={() => cambiarCantidad(c, 1)}><Plus size={13} /></button>
                          </div>
                        </td>
                        <td className="num">
                          <input className="form-input ta-r" type="number" min="0" step="0.01" value={c.descuento}
                            onChange={(e) => actualizar(c.key, { descuento: Math.max(0, Number(e.target.value) || 0) })} />
                        </td>
                        <td className="num tnum" style={{ fontWeight: 600 }}>{q(c.precio_unitario * c.cantidad - (c.descuento || 0))}</td>
                        <td><button className="icon-action" data-variant="delete" title="Quitar" onClick={() => quitar(c.key)}><Trash2 /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Observaciones */}
          <div className="card">
            <div className="card-header"><div className="card-title"><Receipt size={15} style={{ color: 'var(--text-muted)' }} />Observaciones</div></div>
            <div style={{ padding: 16 }}>
              <textarea className="form-textarea" rows={2} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Notas de la venta (opcional)…" />
            </div>
          </div>
        </div>

        {/* ── Resumen (fijo) ────────────────────────────── */}
        <div className="venta-resumen">
          <div className="card">
            <div className="card-header"><div className="card-title">Resumen</div></div>
            <div style={{ padding: 16, display: 'grid', gap: 10 }}>
              <div className="resumen-row"><span className="muted">Items</span><span className="tnum">{cart.length} · {totales.unidades} uds</span></div>
              <div className="resumen-row"><span className="muted">Subtotal</span><span className="tnum">{q(totales.subtotal)}</span></div>
              {totales.descuento > 0 && <div className="resumen-row"><span className="muted">Descuento</span><span className="tnum" style={{ color: 'var(--neg)' }}>− {q(totales.descuento)}</span></div>}
              <div className="resumen-total"><span>Total</span><span className="tnum">{q(totales.total)}</span></div>
              <div className="resumen-row"><span className="muted">Método</span><span className="badge"><span className="b-dot" />{METODO_LABEL[metodo]}</span></div>
              {metodo === 'credito' && <div className="muted" style={{ fontSize: 11, lineHeight: 1.5 }}>La venta quedará <strong>pendiente</strong> y se creará un crédito por el total.</div>}

              <button className="btn btn-primary" style={{ marginTop: 4, height: 42 }} onClick={submit} disabled={guardar.isPending || cart.length === 0}>
                {guardar.isPending ? <Loader2 size={15} className="spin" /> : <ShoppingCart size={15} />} Registrar venta
              </button>
              <button className="btn" onClick={() => navigate('/ventas')} disabled={guardar.isPending}>Cancelar</button>
            </div>
          </div>
        </div>
      </div>

      <CrearClienteRapido open={crearCliente} onClose={() => setCrearCliente(false)} onCreated={(c) => { setCliente(c); setClienteQuery('') }} />
    </>
  )
}
