import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import {
  Loader2, Plus, Minus, Trash2, X, Search, ShoppingCart, ChevronsLeft, ChevronUp,
  Banknote, CreditCard, Landmark, Shuffle, Clock, User, Receipt, Package, Boxes, AlertCircle, MapPin,
} from 'lucide-react'
import { Select } from '@/components/ui/Select'
import { Pagination } from '@/components/ui/Pagination'
import { CrearClienteRapido } from './CrearClienteRapido'
import { useAuth } from '@/lib/auth'
import { ventasApi, catalogosApi } from '@/lib/api'
import { useDebounce, usePaginacionLocal } from '@/lib/hooks'
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

type Vista = 'terminal' | 'formulario'
type TabCat = 'todos' | 'producto' | 'servicio'

const METODOS: { value: MetodoPago; icon: React.ComponentType<{ size?: number }> }[] = [
  { value: 'efectivo', icon: Banknote },
  { value: 'tarjeta', icon: CreditCard },
  { value: 'transferencia', icon: Landmark },
  { value: 'mixto', icon: Shuffle },
  { value: 'credito', icon: Clock },
]

// Catálogo cargado de una vez; la paginación es en cliente
const CATALOGO_LIMIT = 300
const POR_PAGINA = 15

let _seq = 0
const nuevaKey = () => `it-${++_seq}-${Date.now()}`

export default function NuevaVenta() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { usuario } = useAuth()

  const [vista, setVista] = useState<Vista>(() => (localStorage.getItem('ventas_nueva_vista') as Vista) || 'terminal')
  useEffect(() => { localStorage.setItem('ventas_nueva_vista', vista) }, [vista])

  const [tab, setTab] = useState<'producto' | 'servicio'>('producto') // vista formulario
  const [tabCat, setTabCat] = useState<TabCat>('todos')                // vista terminal
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
  const [ticketAbierto, setTicketAbierto] = useState(false) // drawer del ticket en móvil

  const { data: sucursales = [] } = useQuery({
    queryKey: ['sucursales-activas'], queryFn: catalogosApi.sucursalesActivas, staleTime: 1000 * 60 * 10,
  })

  useEffect(() => {
    if (usuario?.sucursal_id && sucursalId === 'default') setSucursalId(String(usuario.sucursal_id))
  }, [usuario]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Búsqueda vista Formulario (dropdown flotante) ────────────────────────────
  const habilitarBusqueda = queryDebounced.trim().length >= 1
  const mostrarResultados = query.trim().length >= 1
  const busqueda = useQuery({
    queryKey: ['venta-buscar', tab, queryDebounced],
    queryFn: () => tab === 'producto' ? ventasApi.buscarProductos(queryDebounced) : ventasApi.buscarServicios(queryDebounced),
    enabled: vista === 'formulario' && habilitarBusqueda,
    placeholderData: keepPreviousData,
  })

  // ── Catálogo vista Terminal (grid paginado) ──────────────────────────────────
  // En la terminal cargamos ambos catálogos de una vez (query vacía = catálogo completo);
  // el filtro por pestaña (Todos/Productos/Servicios) es en cliente.
  const enTerminal = vista === 'terminal'
  const catProductos = useQuery({
    queryKey: ['venta-cat-prod', queryDebounced],
    queryFn: () => ventasApi.buscarProductos(queryDebounced, CATALOGO_LIMIT),
    enabled: enTerminal,
    placeholderData: keepPreviousData,
  })
  const catServicios = useQuery({
    queryKey: ['venta-cat-serv', queryDebounced],
    queryFn: () => ventasApi.buscarServicios(queryDebounced, CATALOGO_LIMIT),
    enabled: enTerminal,
    placeholderData: keepPreviousData,
  })

  const catalogo = useMemo<ResultadoBusqueda[]>(() => {
    const prod = catProductos.data ?? []
    const serv = catServicios.data ?? []
    if (tabCat === 'producto') return prod
    if (tabCat === 'servicio') return serv
    return [...prod, ...serv]
  }, [catProductos.data, catServicios.data, tabCat])

  // Spinner solo mientras no haya NADA que mostrar todavía
  const cargandoCatalogo = (catProductos.isLoading || catServicios.isLoading) && catalogo.length === 0
  const errorCatalogo = catProductos.isError || catServicios.isError
  const recargarCatalogo = () => { catProductos.refetch(); catServicios.refetch() }
  const { slice: catalogoPagina, meta, page, setPage } = usePaginacionLocal(catalogo, POR_PAGINA)

  // ── Clientes ─────────────────────────────────────────────────────────────────
  const clientesBusqueda = useQuery({
    queryKey: ['venta-clientes', clienteQueryDebounced],
    queryFn: () => ventasApi.buscarClientes(clienteQueryDebounced),
    enabled: clienteQueryDebounced.trim().length >= 1 && !cliente,
    placeholderData: keepPreviousData,
  })

  // ── Carrito ──────────────────────────────────────────────────────────────────
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

  // Cantidad ya en el ticket para un ítem del catálogo (badge de la card)
  const cantEnCarrito = (r: ResultadoBusqueda) => {
    const idKey = r.tipo === 'producto' ? 'producto_id' : 'servicio_id'
    return cart.find((c) => c[idKey] === r.id && c.tipo === r.tipo)?.cantidad ?? 0
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
    if (metodo === 'credito' && !cliente) { toast.error('Selecciona o crea un cliente para registrar el crédito'); return }
    guardar.mutate()
  }

  const resultados = busqueda.data ?? []

  // ── Bloques reutilizables ────────────────────────────────────────────────────
  const bloqueCliente = (
    cliente ? (
      <div className="venta-cliente-chip">
        <User size={14} />
        <span style={{ flex: 1 }}>{cliente.nombre}{cliente.nit ? <span className="muted"> · {cliente.nit}</span> : ''}</span>
        <button type="button" className="icon-btn" title="Quitar" onClick={() => { setCliente(null); setClienteQuery('') }}><X size={14} /></button>
      </div>
    ) : (
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <input className="form-input" style={{ flex: 1 }} placeholder="Consumidor final — buscar cliente…" value={clienteQuery} onChange={(e) => setClienteQuery(e.target.value)} />
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
      </div>
    )
  )

  const bloqueMetodos = (
    <div className="metodo-grid pos-metodos">
      {METODOS.map(({ value, icon: Icon }) => (
        <button type="button" key={value} className="metodo-pill" data-on={metodo === value} onClick={() => setMetodo(value)}>
          <Icon size={16} />
          <span>{METODO_LABEL[value]}</span>
        </button>
      ))}
    </div>
  )

  return (
    <>
      <div className="page-head" style={{ alignItems: 'center' }}>
        <button className="back-link" onClick={() => navigate('/ventas')}><ChevronsLeft /> Ventas</button>
        <div style={{ fontWeight: 600, fontSize: 16 }}>Nueva venta</div>
        <div className="pos-view-toggle" style={{ marginLeft: 'auto' }}>
          <button className="pos-view-btn" data-on={vista === 'formulario'} onClick={() => setVista('formulario')}>Formulario</button>
          <button className="pos-view-btn" data-on={vista === 'terminal'} onClick={() => setVista('terminal')}>Terminal POS</button>
        </div>
      </div>

      {vista === 'terminal' ? (
        // ══════════════ VISTA TERMINAL POS ══════════════
        <div className="pos" data-ticket={ticketAbierto ? 'open' : 'closed'}>
          {/* Catálogo */}
          <div className="pos-catalog">
            <div className="pos-toolbar">
              <div className="tabs">
                <button className="tab" data-active={tabCat === 'todos'} onClick={() => setTabCat('todos')}>Todos</button>
                <button className="tab" data-active={tabCat === 'producto'} onClick={() => setTabCat('producto')}>Productos</button>
                <button className="tab" data-active={tabCat === 'servicio'} onClick={() => setTabCat('servicio')}>Servicios</button>
              </div>
              <div className="toolbar-search" style={{ flex: 1, minWidth: 180 }}>
                <Search size={15} />
                <input placeholder="Buscar por nombre o SKU…" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
                {(catProductos.isFetching || catServicios.isFetching) && <Loader2 size={14} className="spin" style={{ color: 'var(--text-faint)' }} />}
                {query && <button type="button" className="ts-clear" onClick={() => setQuery('')} aria-label="Limpiar"><X size={14} /></button>}
              </div>
              <button className="btn" onClick={agregarCustom}><Plus size={14} /> Personalizado</button>
            </div>

            {cargandoCatalogo ? (
              <div className="empty" style={{ padding: 60 }}><Loader2 size={24} className="spin" style={{ color: 'var(--accent)' }} /></div>
            ) : errorCatalogo ? (
              <div className="empty" style={{ padding: 60 }}><AlertCircle size={26} />
                <div style={{ fontSize: 12.5 }}>No se pudo cargar el catálogo</div>
                <button className="btn" style={{ marginTop: 10 }} onClick={recargarCatalogo}>Reintentar</button></div>
            ) : catalogo.length === 0 ? (
              <div className="empty" style={{ padding: 60 }}><Package size={26} />
                <div style={{ fontSize: 12.5 }}>{query.trim() ? 'Sin coincidencias' : 'El catálogo está vacío'}</div></div>
            ) : (
              <>
                <div className="pos-grid">
                  {catalogoPagina.map((r) => {
                    const cant = cantEnCarrito(r)
                    const dscto = r.en_oferta && r.precio_regular ? Math.round((1 - r.precio / r.precio_regular) * 100) : 0
                    return (
                      <button key={`${r.tipo}-${r.id}`} type="button" className="pos-card" data-tipo={r.tipo} data-on={cant > 0} onClick={() => agregar(r)} title={r.nombre}>
                        {cant > 0 && <span className="pos-card-badge">{cant}</span>}
                        {dscto > 0 && <span className="pos-card-oferta">-{dscto}%</span>}
                        <span className="pos-card-icon">
                          {r.imagen ? <img src={r.imagen} alt="" /> : (r.tipo === 'producto' ? <Package size={18} /> : <Boxes size={18} />)}
                        </span>
                        <div className="pos-card-name">{r.nombre}</div>
                        <div className="pos-card-tags">
                          <span className="pos-tag" data-tipo={r.tipo}>{r.tipo === 'producto' ? 'Producto' : 'Servicio'}</span>
                          {r.tipo === 'producto' && r.stock != null && <span className="pos-tag pos-tag-stock">stock {r.stock}</span>}
                        </div>
                        <div className="pos-card-meta">
                          <span className="mono">{r.sku ?? r.codigo}</span>
                          {r.ubicacion && <span className="pos-card-ubic"><MapPin size={11} /> {r.ubicacion}</span>}
                        </div>
                        <div className="pos-card-precio">
                          {dscto > 0 && r.precio_regular && <span className="pos-card-precio-old">{q(r.precio_regular)}</span>}
                          <span className="pos-card-price">{q(r.precio)}</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
                <Pagination meta={meta} page={page} setPage={setPage} />
              </>
            )}
          </div>

          {/* Ticket */}
          <aside className="pos-ticket">
            <div className="card">
              <div className="card-header" style={{ justifyContent: 'space-between' }}>
                <div className="card-title"><Receipt size={15} style={{ color: 'var(--text-muted)' }} />Ticket</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {cart.length > 0 && <button className="icon-action" data-variant="delete" title="Vaciar ticket" onClick={() => setCart([])}><Trash2 /></button>}
                  <button className="pos-ticket-close" title="Cerrar" onClick={() => setTicketAbierto(false)}><X size={16} /></button>
                </div>
              </div>

              <div className="pos-ticket-body">
                {/* Cliente */}
                {bloqueCliente}

                {/* Sucursal */}
                <Select value={sucursalId} onValueChange={setSucursalId} placeholder="Mi sucursal"
                  options={[{ value: 'default', label: 'Mi sucursal (por defecto)' }, ...sucursales.map((s) => ({ value: String(s.id), label: s.nombre }))]} />

                {/* Líneas del ticket */}
                {cart.length === 0 ? (
                  <div className="pos-ticket-empty">
                    <ShoppingCart size={26} />
                    <div style={{ fontWeight: 600, fontSize: 13 }}>Ticket vacío</div>
                    <div className="muted" style={{ fontSize: 11.5 }}>Toca un producto del catálogo para agregarlo.</div>
                  </div>
                ) : (
                  <div className="pos-lines">
                    {cart.map((c) => (
                      <div key={c.key} className="pos-line">
                        <div className="pos-line-name-area">
                          {c.tipo === 'otro'
                            ? <input className="form-input" style={{ height: 30, fontSize: 12.5 }} placeholder="Descripción" value={c.descripcion} onChange={(e) => actualizar(c.key, { descripcion: e.target.value })} />
                            : <div className="pos-line-name">{c.descripcion}</div>}
                        </div>
                        <div className="pos-line-price-area">
                          Q <input className="pos-price-input" type="number" min="0" step="0.01" value={c.precio_unitario}
                            onChange={(e) => actualizar(c.key, { precio_unitario: Math.max(0, Number(e.target.value) || 0) })} />
                          <span className="pos-line-cu">c/u</span>
                        </div>
                        <button className="pos-line-del" title="Quitar" onClick={() => quitar(c.key)}><X size={14} /></button>
                        <div className="pos-line-qty-area">
                          <div className="qty-stepper">
                            <button type="button" onClick={() => cambiarCantidad(c, -1)} disabled={c.cantidad <= 1}><Minus size={13} /></button>
                            <input type="number" min="1" max={c.stock} value={c.cantidad}
                              onChange={(e) => { let n = Math.max(1, Math.floor(Number(e.target.value) || 1)); if (c.stock != null && n > c.stock) { n = c.stock; toast.error(`Stock máximo: ${c.stock}`) } actualizar(c.key, { cantidad: n }) }} />
                            <button type="button" onClick={() => cambiarCantidad(c, 1)}><Plus size={13} /></button>
                          </div>
                          <label className="pos-line-dcto">Dcto Q
                            <input className="pos-dcto-input" type="number" min="0" step="0.01" value={c.descuento}
                              onChange={(e) => actualizar(c.key, { descuento: Math.max(0, Number(e.target.value) || 0) })} />
                          </label>
                          {(c.cantidad > 1 || c.descuento > 0) && <span className="pos-line-sub tnum">{q(c.precio_unitario * c.cantidad - (c.descuento || 0))}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Método de pago */}
                {bloqueMetodos}
                {metodo === 'credito' && !cliente && (
                  <div className="venta-credito-aviso">
                    <AlertCircle size={15} />
                    <span>El crédito se registra a nombre del cliente. <b>Selecciona o crea uno</b> arriba.</span>
                  </div>
                )}

                {/* Observaciones */}
                <textarea className="form-textarea" rows={2} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Observaciones (opcional)…" />

                {/* Total + cobrar */}
                <div className="pos-total">
                  <span>Total <span className="muted" style={{ fontSize: 11.5 }}>· {totales.unidades} uds</span></span>
                  <span className="tnum">{q(totales.total)}</span>
                </div>
                <button className="btn btn-primary" style={{ height: 46, fontSize: 14 }} onClick={submit} disabled={guardar.isPending || cart.length === 0}>
                  {guardar.isPending ? <Loader2 size={16} className="spin" /> : <ShoppingCart size={16} />} Cobrar {totales.total > 0 ? q(totales.total) : ''}
                </button>
              </div>
            </div>
          </aside>

          {/* Fondo oscuro al abrir el ticket en móvil */}
          <div className="pos-ticket-backdrop" onClick={() => setTicketAbierto(false)} />

          {/* Barra fija inferior (solo móvil): resumen + abrir ticket + cobrar */}
          <div className="pos-mobile-bar">
            <button type="button" className="pos-mobile-summary" onClick={() => setTicketAbierto(true)}>
              <ShoppingCart size={18} />
              <span className="pos-mobile-count">{totales.unidades}</span>
              <span className="pos-mobile-total tnum">{q(totales.total)}</span>
              <ChevronUp size={16} style={{ color: 'var(--text-faint)' }} />
            </button>
            <button type="button" className="btn btn-primary pos-mobile-cobrar" onClick={submit} disabled={guardar.isPending || cart.length === 0}>
              {guardar.isPending ? <Loader2 size={16} className="spin" /> : 'Cobrar'}
            </button>
          </div>
        </div>
      ) : (
        // ══════════════ VISTA FORMULARIO ══════════════
        <div className="venta-create-grid">
          <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
            <div className="card">
              <div className="card-header"><div className="card-title"><User size={15} style={{ color: 'var(--text-muted)' }} />Información general</div></div>
              <div className="form-grid" style={{ padding: 16 }}>
                <div className="form-field col-2" style={{ position: 'relative' }}>
                  <label>Cliente <span className="muted" style={{ fontWeight: 400 }}>· opcional</span></label>
                  {bloqueCliente}
                  {!cliente && <span className="muted" style={{ fontSize: 11, marginTop: 4 }}>Deja vacío para cliente ocasional.</span>}
                </div>

                <div className="form-field col-2">
                  <label>Método de pago</label>
                  {bloqueMetodos}
                </div>

                <div className="form-field">
                  <label>Sucursal</label>
                  <Select value={sucursalId} onValueChange={setSucursalId} placeholder="Mi sucursal"
                    options={[{ value: 'default', label: 'Mi sucursal (por defecto)' }, ...sucursales.map((s) => ({ value: String(s.id), label: s.nombre }))]} />
                </div>

                {metodo === 'credito' && !cliente && (
                  <div className="form-field col-2 venta-credito-aviso">
                    <AlertCircle size={15} />
                    <span>El crédito se registra a nombre del cliente. <b>Selecciona o crea un cliente</b> arriba.</span>
                  </div>
                )}
              </div>
            </div>

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
                      <input placeholder={`Buscar ${tab === 'producto' ? 'productos' : 'servicios'}…`} value={query} onChange={(e) => setQuery(e.target.value)} />
                      {busqueda.isFetching && <Loader2 size={14} className="spin" style={{ color: 'var(--text-faint)' }} />}
                      {query && <button type="button" className="ts-clear" onClick={() => setQuery('')} aria-label="Limpiar búsqueda"><X size={14} /></button>}
                    </div>
                    <button className="btn" onClick={agregarCustom}><Plus size={14} /> Personalizado</button>
                  </div>

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

            <div className="card">
              <div className="card-header"><div className="card-title"><Receipt size={15} style={{ color: 'var(--text-muted)' }} />Observaciones</div></div>
              <div style={{ padding: 16 }}>
                <textarea className="form-textarea" rows={2} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Notas de la venta (opcional)…" />
              </div>
            </div>
          </div>

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
      )}

      <CrearClienteRapido open={crearCliente} onClose={() => setCrearCliente(false)} onCreated={(c) => { setCliente(c); setClienteQuery('') }} />
    </>
  )
}
