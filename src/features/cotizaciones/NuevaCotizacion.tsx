import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import {
  ChevronsLeft, ChevronUp, User, X, Plus, Minus, Search, Loader2, Trash2,
  Package, Boxes, Receipt, FileText, MapPin, Store, Percent, AlertCircle,
  AlertTriangle, CalendarClock,
} from 'lucide-react'
import { Select } from '@/components/ui/Select'
import { Pagination } from '@/components/ui/Pagination'
import { CrearClienteRapido } from '../ventas/CrearClienteRapido'
import { useAuth } from '@/lib/auth'
import { cotizacionesApi, ventasApi, catalogosApi } from '@/lib/api'
import { useDebounce, usePaginacionLocal, useAutoPageSize } from '@/lib/hooks'
import { q } from '@/lib/format'
import type { ClienteBusqueda, ResultadoBusqueda } from '@/types/venta'
import type { CotizacionItemPayload } from '@/types/cotizacion'

interface Linea {
  key: string
  tipo: 'producto' | 'servicio'
  descripcion: string
  precio_unitario: number
  cantidad: number
  descuento: number
  producto_id?: number
  servicio_id?: number
  /** Existencias del momento. Informativo: cotizar lo que no hay es legítimo. */
  stock?: number
  custom?: boolean
  costo?: number
}

/** Campo vacío = sin costo registrado (undefined), distinto de un 0 a propósito. */
function costoDeInput(valor: string): number | undefined {
  if (valor.trim() === '') return undefined
  return Math.max(0, Number(valor) || 0)
}

type TabCat = 'todos' | 'producto' | 'servicio'

/** Vigencia por defecto, en días. Coincide con CotizacionService::DIAS_VIGENCIA. */
const DIAS_VIGENCIA = 15

/** Catálogo cargado de una vez; la paginación es en cliente. */
const CATALOGO_LIMIT = 300

function fechaISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

let _seq = 0
const nuevaKey = () => `cot-${++_seq}-${Date.now()}`

export default function NuevaCotizacion() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { usuario } = useAuth()
  const { id } = useParams<{ id: string }>()
  const editando = Boolean(id)

  const [tabCat, setTabCat] = useState<TabCat>('todos')
  const [query, setQuery] = useState('')
  const queryDebounced = useDebounce(query, 300)
  const [lineas, setLineas] = useState<Linea[]>([])
  const [dctoAbierto, setDctoAbierto] = useState<Set<string>>(new Set())
  const [cliente, setCliente] = useState<ClienteBusqueda | null>(null)
  const [clienteQuery, setClienteQuery] = useState('')
  const clienteQueryDebounced = useDebounce(clienteQuery, 300)
  const [nombreLibre, setNombreLibre] = useState('')
  const [sucursalId, setSucursalId] = useState(() => usuario?.sucursal_id ? String(usuario.sucursal_id) : 'default')
  const [validoHasta, setValidoHasta] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + DIAS_VIGENCIA)
    return fechaISO(d)
  })
  const [observaciones, setObservaciones] = useState('')
  const [crearCliente, setCrearCliente] = useState(false)
  const [ticketAbierto, setTicketAbierto] = useState(false)

  const { data: sucursales = [] } = useQuery({
    queryKey: ['sucursales-activas'], queryFn: catalogosApi.sucursalesActivas, staleTime: 1000 * 60 * 10,
  })

  // ── Cargar la cotización al editar ───────────────────────────────────────────
  const existente = useQuery({
    queryKey: ['cotizacion', id],
    queryFn: () => cotizacionesApi.obtener(Number(id)),
    enabled: editando,
  })

  useEffect(() => {
    const c = existente.data
    if (!c) return
    setLineas(c.detalles.map((d) => ({
      key: nuevaKey(),
      tipo: d.tipo,
      descripcion: d.descripcion,
      precio_unitario: Number(d.precio_unitario),
      cantidad: d.cantidad,
      descuento: Number(d.descuento) || 0,
      producto_id: d.producto_id ?? undefined,
      servicio_id: d.servicio_id ?? undefined,
      // Sin referencia al catálogo = línea escrita a mano
      custom: d.producto_id === null && d.servicio_id === null,
      costo: d.costo != null ? Number(d.costo) : undefined,
    })))
    if (c.cliente) setCliente({ id: c.cliente.id, nombre: c.cliente.nombre, nit: c.cliente.nit })
    setNombreLibre(c.nombre_cliente ?? '')
    setSucursalId(c.sucursal_id ? String(c.sucursal_id) : 'default')
    setValidoHasta(c.valido_hasta)
    setObservaciones(c.observaciones ?? '')
  }, [existente.data])

  useEffect(() => {
    if (!editando && usuario?.sucursal_id && sucursalId === 'default') setSucursalId(String(usuario.sucursal_id))
  }, [usuario]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Catálogo ─────────────────────────────────────────────────────────────────
  const catProductos = useQuery({
    queryKey: ['cot-cat-prod', queryDebounced],
    queryFn: () => ventasApi.buscarProductos(queryDebounced, CATALOGO_LIMIT),
    placeholderData: keepPreviousData,
  })
  const catServicios = useQuery({
    queryKey: ['cot-cat-serv', queryDebounced],
    queryFn: () => ventasApi.buscarServicios(queryDebounced, CATALOGO_LIMIT),
    placeholderData: keepPreviousData,
  })

  const catalogo = useMemo<ResultadoBusqueda[]>(() => {
    const prod = catProductos.data ?? []
    const serv = catServicios.data ?? []
    if (tabCat === 'producto') return prod
    if (tabCat === 'servicio') return serv
    // Concatenar dejaría todos los productos antes que cualquier servicio sin
    // importar ventas reales; se mezclan y reordenan para que compitan entre sí.
    return [...prod, ...serv].sort((a, b) =>
      (b.vendidos ?? 0) - (a.vendidos ?? 0) || a.nombre.localeCompare(b.nombre, 'es'))
  }, [catProductos.data, catServicios.data, tabCat])

  const cargandoCatalogo = (catProductos.isLoading || catServicios.isLoading) && catalogo.length === 0
  const errorCatalogo = catProductos.isError || catServicios.isError
  const recargarCatalogo = () => { catProductos.refetch(); catServicios.refetch() }
  const { ref: catGridRef, perPage: autoPerPage } = useAutoPageSize({ rows: 4 })
  const { slice: catalogoPagina, meta, page, setPage } = usePaginacionLocal(catalogo, autoPerPage)

  const clientesBusqueda = useQuery({
    queryKey: ['cot-clientes', clienteQueryDebounced],
    queryFn: () => ventasApi.buscarClientes(clienteQueryDebounced),
    enabled: clienteQueryDebounced.trim().length >= 1 && !cliente,
    placeholderData: keepPreviousData,
  })

  // ── Líneas ───────────────────────────────────────────────────────────────────
  const agregar = (r: ResultadoBusqueda) => {
    setLineas((prev) => {
      const idKey = r.tipo === 'producto' ? 'producto_id' : 'servicio_id'
      const existe = prev.find((l) => l[idKey] === r.id && l.tipo === r.tipo)
      // A diferencia de una venta, aquí no hay tope por stock: se cotiza
      // precisamente lo que todavía no se tiene.
      if (existe) return prev.map((l) => l === existe ? { ...l, cantidad: l.cantidad + 1 } : l)
      return [...prev, {
        key: nuevaKey(),
        tipo: r.tipo,
        descripcion: r.tipo === 'producto' ? (r.nombre_completo || r.nombre) : r.nombre,
        precio_unitario: Number(r.precio) || 0,
        cantidad: 1,
        descuento: 0,
        ...(r.tipo === 'producto' ? { producto_id: r.id, stock: r.stock } : { servicio_id: r.id }),
      }]
    })
  }

  // El costo nace vacío, no en 0: un 0 se guardaría como costo real y la línea
  // aparecería con 100% de margen sin ningún aviso.
  const agregarCustom = () => setLineas((prev) => [...prev, {
    key: nuevaKey(), tipo: 'producto', custom: true, descripcion: '', precio_unitario: 0, cantidad: 1, descuento: 0,
  }])

  const actualizar = (key: string, patch: Partial<Linea>) =>
    setLineas((prev) => prev.map((l) => l.key === key ? { ...l, ...patch } : l))
  const quitar = (key: string) => setLineas((prev) => prev.filter((l) => l.key !== key))
  const cambiarCantidad = (l: Linea, delta: number) =>
    actualizar(l.key, { cantidad: Math.max(1, l.cantidad + delta) })

  const abrirDcto = (key: string) => setDctoAbierto((s) => new Set(s).add(key))
  const cerrarDcto = (l: Linea) => {
    actualizar(l.key, { descuento: 0 })
    setDctoAbierto((s) => { const n = new Set(s); n.delete(l.key); return n })
  }

  const cantEnTicket = (r: ResultadoBusqueda) => {
    const idKey = r.tipo === 'producto' ? 'producto_id' : 'servicio_id'
    return lineas.find((l) => l[idKey] === r.id && l.tipo === r.tipo)?.cantidad ?? 0
  }

  const totales = useMemo(() => {
    const subtotal = lineas.reduce((s, l) => s + l.precio_unitario * l.cantidad, 0)
    const descuento = lineas.reduce((s, l) => s + (l.descuento || 0), 0)
    const unidades = lineas.reduce((s, l) => s + l.cantidad, 0)
    return { subtotal, descuento, total: subtotal - descuento, unidades }
  }, [lineas])

  /** Líneas que piden más de lo que hay. No impide cotizar, solo avisa. */
  const sinStock = useMemo(
    () => lineas.filter((l) => l.stock != null && l.cantidad > l.stock),
    [lineas],
  )

  const diasVigencia = useMemo(() => {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
    const hasta = new Date(`${validoHasta}T00:00:00`)
    return Math.round((hasta.getTime() - hoy.getTime()) / 86_400_000)
  }, [validoHasta])

  // ── Guardar ──────────────────────────────────────────────────────────────────
  const guardar = useMutation({
    mutationFn: () => {
      const items: CotizacionItemPayload[] = lineas.map((l) => ({
        tipo: l.tipo,
        cantidad: l.cantidad,
        descripcion: l.descripcion.trim(),
        precio_unitario: l.precio_unitario,
        descuento: l.descuento || 0,
        // El costo solo se registra en líneas manuales; en las del catálogo lo
        // deriva el reporte del precio de compra.
        costo: l.custom ? (l.costo ?? null) : null,
        producto_id: l.producto_id ?? null,
        servicio_id: l.servicio_id ?? null,
      }))
      const payload = {
        items,
        cliente_id: cliente?.id ?? null,
        nombre_cliente: cliente ? null : (nombreLibre.trim() || null),
        sucursal_id: sucursalId !== 'default' ? Number(sucursalId) : null,
        valido_hasta: validoHasta,
        observaciones: observaciones.trim() || null,
      }
      return editando
        ? cotizacionesApi.actualizar(Number(id), payload)
        : cotizacionesApi.crear(payload)
    },
    onSuccess: (cot) => {
      toast.success(editando ? `Cotización ${cot.numero_cotizacion} actualizada` : `Cotización ${cot.numero_cotizacion} creada`)
      queryClient.invalidateQueries({ queryKey: ['cotizaciones'] })
      queryClient.invalidateQueries({ queryKey: ['cotizacion', id] })
      navigate('/cotizaciones')
    },
    onError: (err) => {
      if (isAxiosError(err) && err.response?.status === 422) toast.error(err.response.data?.message ?? 'Revisa las líneas de la cotización')
      else toast.error('No se pudo guardar la cotización')
    },
  })

  const submit = () => {
    if (lineas.length === 0) { toast.error('Agrega al menos una línea'); return }
    for (const l of lineas) {
      if (!l.descripcion.trim()) { toast.error('Todas las líneas necesitan descripción'); return }
      if (l.precio_unitario < 0 || l.cantidad < 1) { toast.error('Revisa precios y cantidades'); return }
      if (l.descuento > l.precio_unitario * l.cantidad) { toast.error(`El descuento de "${l.descripcion}" supera su subtotal`); return }
    }
    if (!validoHasta) { toast.error('Indica hasta cuándo es válida la cotización'); return }
    guardar.mutate()
  }

  if (editando && existente.isLoading) {
    return <div className="empty" style={{ padding: 60 }}><Loader2 size={26} className="spin" /><div>Cargando cotización…</div></div>
  }

  return (
    <>
      <div className="page-head" style={{ alignItems: 'center' }}>
        <button className="back-link" onClick={() => navigate('/cotizaciones')}><ChevronsLeft /> Cotizaciones</button>
        <div style={{ fontWeight: 600, fontSize: 16 }}>
          {editando ? `Editar ${existente.data?.numero_cotizacion ?? ''}` : 'Nueva cotización'}
        </div>
      </div>

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
              <div className="pos-grid" ref={catGridRef}>
                {catalogoPagina.map((r) => {
                  const cant = cantEnTicket(r)
                  const dscto = r.en_oferta && r.precio_regular ? Math.round((1 - r.precio / r.precio_regular) * 100) : 0
                  return (
                    <button key={`${r.tipo}-${r.id}`} type="button" className="pos-card" data-tipo={r.tipo} data-on={cant > 0} onClick={() => agregar(r)} title={r.tipo === 'producto' ? (r.nombre_completo || r.nombre) : r.nombre}>
                      {cant > 0 && <span className="pos-card-badge">{cant}</span>}
                      {dscto > 0 && <span className="pos-card-oferta">-{dscto}%</span>}
                      <span className="pos-card-icon">
                        {r.imagen ? <img src={r.imagen} alt="" /> : (r.tipo === 'producto' ? <Package size={18} /> : <Boxes size={18} />)}
                      </span>
                      <div className="pos-card-name">{r.tipo === 'producto' ? (r.nombre_completo || r.nombre) : r.nombre}</div>
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
              <div className="card-title"><FileText size={15} style={{ color: 'var(--text-muted)' }} />Cotización</div>
              <div style={{ display: 'flex', gap: 4 }}>
                {lineas.length > 0 && <button className="icon-action" data-variant="delete" title="Vaciar" onClick={() => setLineas([])}><Trash2 /></button>}
                <button className="pos-ticket-close" title="Cerrar" onClick={() => setTicketAbierto(false)}><X size={16} /></button>
              </div>
            </div>

            <div className="pos-ticket-body">
              {/* Sucursal + Cliente + Vigencia */}
              <div className="pos-meta">
                <div className="pos-meta-field">
                  <label className="pos-meta-label"><Store size={11} /> Sucursal</label>
                  <Select value={sucursalId} onValueChange={setSucursalId} placeholder="Mi sucursal"
                    options={[{ value: 'default', label: 'Mi sucursal (por defecto)' }, ...sucursales.map((s) => ({ value: String(s.id), label: s.nombre }))]} />
                </div>
                <div className="pos-meta-field">
                  <label className="pos-meta-label"><User size={11} /> Cliente</label>
                  {cliente ? (
                    <div className="pos-client-chip">
                      <User size={13} />
                      <span>{cliente.nombre}</span>
                      <button className="cx" title="Quitar cliente" onClick={() => { setCliente(null); setClienteQuery('') }}><X size={13} /></button>
                    </div>
                  ) : (
                    <div className="ac-wrap">
                      <div className="pos-client-search">
                        <Search size={13} />
                        <input placeholder="Buscar cliente…" value={clienteQuery} onChange={(e) => setClienteQuery(e.target.value)} />
                        {clienteQuery && (
                          <button className="pos-client-clear" title="Limpiar búsqueda" onClick={() => setClienteQuery('')}><X size={13} /></button>
                        )}
                        <button className="pos-client-add" title="Crear cliente" onClick={() => setCrearCliente(true)}><Plus size={13} /></button>
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
                  )}
                </div>

                {/* Sin cliente registrado se puede poner un nombre suelto: cotizar
                    a alguien que todavía no está en la base es lo habitual. */}
                {!cliente && (
                  <div className="pos-meta-field">
                    <label className="pos-meta-label"><User size={11} /> O un nombre suelto</label>
                    <input className="form-input" placeholder="Ferretería El Tornillo…" value={nombreLibre}
                      onChange={(e) => setNombreLibre(e.target.value)} />
                  </div>
                )}

                <div className="pos-meta-field">
                  <label className="pos-meta-label"><CalendarClock size={11} /> Válida hasta</label>
                  <input className="form-input" type="date" value={validoHasta} min={fechaISO(new Date())}
                    onChange={(e) => setValidoHasta(e.target.value)} />
                  <span className="muted" style={{ fontSize: 10.5, marginTop: 3 }}>
                    {diasVigencia > 0 ? `${diasVigencia} día${diasVigencia === 1 ? '' : 's'} de vigencia` : 'Vence hoy'}
                  </span>
                </div>
              </div>

              {/* Líneas */}
              {lineas.length === 0 ? (
                <div className="pos-ticket-empty">
                  <FileText size={26} />
                  <div style={{ fontWeight: 600, fontSize: 13 }}>Cotización vacía</div>
                  <div className="muted" style={{ fontSize: 11.5 }}>Toca un producto del catálogo para agregarlo.</div>
                </div>
              ) : (
                <div className="pos-items">
                  {lineas.map((l) => {
                    const mostrarDcto = dctoAbierto.has(l.key) || l.descuento > 0
                    const stepper = (
                      <div className="qty-stepper">
                        <button type="button" title={l.cantidad <= 1 ? 'Quitar' : 'Restar'} data-del={l.cantidad <= 1}
                          onClick={() => l.cantidad <= 1 ? quitar(l.key) : cambiarCantidad(l, -1)}>
                          {l.cantidad <= 1 ? <Trash2 size={12} /> : <Minus size={12} />}
                        </button>
                        {/* Sin max: cotizar por encima de las existencias es válido */}
                        <input type="number" min="1" value={l.cantidad}
                          onChange={(e) => actualizar(l.key, { cantidad: Math.max(1, Math.floor(Number(e.target.value) || 1)) })} />
                        <button type="button" title="Sumar" onClick={() => cambiarCantidad(l, 1)}><Plus size={12} /></button>
                      </div>
                    )
                    const controls = (
                      <div className="tk-controls">
                        {stepper}
                        <div className="tk-price">
                          <span className="tk-price-pre">Q</span>
                          <input className="li-input" type="number" min="0" step="0.01" value={l.precio_unitario}
                            onChange={(e) => actualizar(l.key, { precio_unitario: Math.max(0, Number(e.target.value) || 0) })} />
                        </div>
                        <div className="tk-total tnum">{q(l.precio_unitario * l.cantidad - (l.descuento || 0))}</div>
                      </div>
                    )
                    const descuentoBloque = mostrarDcto ? (
                      <div className="tk-discount">
                        <Percent size={11} />
                        <span>Descuento</span>
                        <span className="tk-price-pre">Q</span>
                        <input className="li-input small" type="number" min="0" step="0.01" value={l.descuento}
                          onChange={(e) => actualizar(l.key, { descuento: Math.max(0, Number(e.target.value) || 0) })} />
                        <button className="cx" title="Quitar descuento" onClick={() => cerrarDcto(l)}><X size={11} /></button>
                      </div>
                    ) : (
                      <button className="tk-add-discount" onClick={() => abrirDcto(l.key)}><Percent size={11} /> Agregar descuento</button>
                    )

                    return (
                      <div key={l.key} className="tk-row">
                        <div className="tk-top">
                          {l.custom
                            ? <input className="li-input tk-name-input" placeholder="Descripción del item" value={l.descripcion} onChange={(e) => actualizar(l.key, { descripcion: e.target.value })} />
                            : <div className="tk-name">{l.descripcion}{l.tipo === 'servicio' && <span className="li-kind">Servicio</span>}</div>}
                          <button className="tk-remove" title="Quitar" onClick={() => quitar(l.key)}><X size={13} /></button>
                        </div>

                        {l.custom && (
                          <div className="custom-tipo-toggle">
                            <button type="button" data-tipo="producto" data-active={l.tipo === 'producto'} onClick={() => actualizar(l.key, { tipo: 'producto' })}>Producto</button>
                            <button type="button" data-tipo="servicio" data-active={l.tipo === 'servicio'} onClick={() => actualizar(l.key, { tipo: 'servicio' })}>Servicio</button>
                          </div>
                        )}

                        {controls}

                        {!l.custom && l.stock != null && l.cantidad > l.stock && (
                          <div className="tk-aviso-stock">
                            <AlertTriangle size={11} />
                            <span>Pide {l.cantidad} y hay {l.stock}</span>
                          </div>
                        )}

                        {l.custom && (
                          <label className="tk-costo" title="Lo que te costó cada unidad, no el total de la línea">Costo c/u <span className="tk-price-pre">Q</span>
                            <input className="li-input small" type="number" min="0" step="0.01" placeholder="—" value={l.costo ?? ''}
                              onChange={(e) => actualizar(l.key, { costo: costoDeInput(e.target.value) })} />
                          </label>
                        )}

                        <div className="tk-bottom">{descuentoBloque}</div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Pie: observaciones + totales */}
              <div className="pos-foot">
                <textarea className="form-textarea" rows={2} value={observaciones} onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Condiciones, tiempos de entrega… (aparecen en el PDF)" />

                {sinStock.length > 0 && (
                  <div className="venta-credito-aviso">
                    <AlertTriangle size={15} />
                    <span>{sinStock.length} línea{sinStock.length === 1 ? '' : 's'} por encima de las existencias. <b>Se puede cotizar igual</b>; el aviso reaparece al convertirla en venta.</span>
                  </div>
                )}

                <div className="sum-rows">
                  <div className="sum-row"><span>Subtotal</span><span className="sv tnum">{q(totales.subtotal)}</span></div>
                  {totales.descuento > 0 && (
                    <div className="sum-row"><span>Descuento</span><span className="sv discount tnum">− {q(totales.descuento)}</span></div>
                  )}
                  <div className="sum-row total">
                    <span>Total <span className="sum-uds">· {totales.unidades} uds</span></span>
                    <span className="sv tnum">{q(totales.total)}</span>
                  </div>
                </div>

                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', height: 44, fontSize: 14 }} onClick={submit} disabled={guardar.isPending || lineas.length === 0}>
                  {guardar.isPending ? <Loader2 size={16} className="spin" /> : <FileText size={16} />} {editando ? 'Guardar cambios' : 'Crear cotización'}
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Fondo oscuro al abrir el panel en móvil */}
        <div className="pos-ticket-backdrop" onClick={() => setTicketAbierto(false)} />

        {/* Barra fija inferior (solo móvil) */}
        <div className="pos-mobile-bar">
          <button type="button" className="pos-mobile-summary" onClick={() => setTicketAbierto(true)}>
            <Receipt size={18} />
            <span className="pos-mobile-count">{totales.unidades}</span>
            <span className="pos-mobile-total tnum">{q(totales.total)}</span>
            <ChevronUp size={16} style={{ color: 'var(--text-faint)' }} />
          </button>
          <button type="button" className="btn btn-primary pos-mobile-cobrar" onClick={submit} disabled={guardar.isPending || lineas.length === 0}>
            {guardar.isPending ? <Loader2 size={16} className="spin" /> : 'Guardar'}
          </button>
        </div>
      </div>

      <CrearClienteRapido open={crearCliente} onClose={() => setCrearCliente(false)} onCreated={(c) => { setCliente(c); setClienteQuery('') }} />
    </>
  )
}
