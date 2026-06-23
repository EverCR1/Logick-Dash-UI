import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, Eye, Pencil, Trash2, LayoutGrid, List, Ban, CheckCircle2, X, Package, PackagePlus, CheckCircle, AlertTriangle, XCircle, Tag } from 'lucide-react'
import { I } from '@/components/icons'
import { Select } from '@/components/ui/Select'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Lightbox } from '@/components/ui/Lightbox'
import { ProductoForm } from './ProductoForm'
import { AjustarStock } from './AjustarStock'
import { productosApi, catalogosApi } from '@/lib/api'
import { q, fmtN } from '@/lib/format'
import type { Producto, ProductoFiltros, Paginado } from '@/types/producto'

const PER_PAGE = 15
type Vista = 'tabla' | 'cards'

export default function ProductosPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [estado, setEstado] = useState('todos')
  const [stock, setStock] = useState('todos')
  const [categoria, setCategoria] = useState('todos')
  const [page, setPage] = useState(1)
  const [aEliminar, setAEliminar] = useState<Producto | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [productoEditar, setProductoEditar] = useState<Producto | null>(null)
  const [vista, setVista] = useState<Vista>(() => (localStorage.getItem('productos_vista') as Vista) || 'tabla')
  const [zoom, setZoom] = useState<string | null>(null)
  const [aReestockear, setAReestockear] = useState<Producto | null>(null)

  const abrirNuevo = () => { setProductoEditar(null); setFormOpen(true) }
  const abrirEditar = (p: Producto) => { setProductoEditar(p); setFormOpen(true) }

  useEffect(() => { localStorage.setItem('productos_vista', vista) }, [vista])

  useEffect(() => {
    const t = setTimeout(() => { setSearchDebounced(search); setPage(1) }, 350)
    return () => clearTimeout(t)
  }, [search])

  const filtros: ProductoFiltros = {
    search: searchDebounced || undefined,
    estado: estado !== 'todos' ? estado : undefined,
    stock: stock !== 'todos' ? stock : undefined,
    categoria_id: categoria !== 'todos' ? Number(categoria) : undefined,
    page,
    per_page: PER_PAGE,
  }

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['productos', filtros],
    queryFn: () => productosApi.listar(filtros),
    placeholderData: keepPreviousData,
  })

  const { data: categorias = [] } = useQuery({
    queryKey: ['categorias-opciones'],
    queryFn: catalogosApi.categorias,
    staleTime: 1000 * 60 * 10,
  })

  const eliminar = useMutation({
    mutationFn: (id: number) => productosApi.eliminar(id),
    onSuccess: () => {
      toast.success('Producto eliminado')
      setAEliminar(null)
      queryClient.invalidateQueries({ queryKey: ['productos'] })
    },
    onError: () => toast.error('No se pudo eliminar el producto'),
  })

  const cambiarEstado = useMutation({
    mutationFn: ({ id, estado }: { id: number; estado: 'activo' | 'inactivo' }) =>
      productosApi.cambiarEstado(id, estado),
    onSuccess: () => {
      toast.success('Estado actualizado')
      queryClient.invalidateQueries({ queryKey: ['productos'] })
    },
    onError: () => toast.error('No se pudo cambiar el estado'),
  })

  const productos = data?.productos.data ?? []
  const counts = data?.counts
  const meta = data?.productos

  const opcionesCategoria = [
    { value: 'todos', label: 'Todas las categorías' },
    ...categorias.map((c) => ({ value: String(c.id), label: '— '.repeat(c.nivel) + c.nombre })),
  ]

  const onToggleEstado = (p: Producto) =>
    cambiarEstado.mutate({ id: p.id, estado: p.estado === 'activo' ? 'inactivo' : 'activo' })

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">Productos</div>
          <div className="page-sub">Gestiona tu catálogo de productos</div>
        </div>
        <button className="btn btn-primary" onClick={abrirNuevo}>
          <I.Plus /> Nuevo producto
        </button>
      </div>

      {counts && (
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}>
          {[
            { label: 'Total', value: counts.total, icon: Package, tone: 'accent' as const, sub: 'productos en catálogo' },
            { label: 'Activos', value: counts.activos, icon: CheckCircle, tone: 'pos' as const, sub: 'disponibles' },
            { label: 'Bajo stock', value: counts.stock_bajo, icon: AlertTriangle, tone: 'warn' as const, sub: 'por reabastecer' },
            { label: 'Agotados', value: counts.agotados, icon: XCircle, tone: 'neg' as const, sub: 'sin existencias' },
            { label: 'En oferta', value: counts.en_oferta, icon: Tag, tone: 'violet' as const, sub: 'con descuento' },
          ].map((k, i) => {
            const IconC = k.icon
            return (
              <div key={i} className="kpi">
                <div className="kpi-row1"><div className="kpi-label">{k.label}</div><div className="kpi-icon" data-tone={k.tone}><IconC /></div></div>
                <div className="kpi-value tnum">{fmtN(k.value)}</div>
                <div className="kpi-meta"><span>{k.sub}</span></div>
              </div>
            )
          })}
        </div>
      )}

      <div className="toolbar">
        <div className="toolbar-search">
          <I.Search />
          <input placeholder="Buscar por nombre, SKU, marca, ubicación…" value={search} onChange={(e) => setSearch(e.target.value)} />
          {isFetching && <Loader2 size={14} className="spin" style={{ color: 'var(--text-faint)' }} />}
        </div>
        <Select value={estado} onValueChange={(v) => { setEstado(v); setPage(1) }} ariaLabel="Estado"
          options={[{ value: 'todos', label: 'Todos los estados' }, { value: 'activo', label: 'Activos' }, { value: 'inactivo', label: 'Inactivos' }]} />
        <Select value={stock} onValueChange={(v) => { setStock(v); setPage(1) }} ariaLabel="Stock"
          options={[{ value: 'todos', label: 'Todo el stock' }, { value: 'disponible', label: 'Con stock' }, { value: 'bajo', label: 'Bajo stock' }, { value: 'agotado', label: 'Agotados' }]} />
        <Select value={categoria} onValueChange={(v) => { setCategoria(v); setPage(1) }} ariaLabel="Categoría" options={opcionesCategoria} />
        {(search || estado !== 'todos' || stock !== 'todos' || categoria !== 'todos') && (
          <button className="btn" onClick={() => { setSearch(''); setEstado('todos'); setStock('todos'); setCategoria('todos'); setPage(1) }} title="Limpiar filtros"><X size={15} /> Limpiar</button>
        )}
        <div className="view-toggle">
          <button data-on={vista === 'tabla'} onClick={() => setVista('tabla')} title="Vista de tabla"><List /></button>
          <button data-on={vista === 'cards'} onClick={() => setVista('cards')} title="Vista de tarjetas"><LayoutGrid /></button>
        </div>
      </div>

      {isLoading ? (
        <div className="card"><div className="empty" style={{ padding: 80 }}><Loader2 size={26} className="spin" style={{ color: 'var(--accent)' }} /><div>Cargando productos…</div></div></div>
      ) : isError ? (
        <div className="card"><div className="empty" style={{ padding: 80 }}>
          <I.AlertCircle /><div>No se pudieron cargar los productos</div>
          <button className="btn" style={{ marginTop: 10 }} onClick={() => refetch()}><I.Refresh /> Reintentar</button>
        </div></div>
      ) : productos.length === 0 ? (
        <div className="card"><div className="empty" style={{ padding: 80 }}><I.Package /><div>No se encontraron productos con esos filtros</div></div></div>
      ) : vista === 'cards' ? (
        <>
          <div className="pcards">
            {productos.map((p) => (
              <ProductoCard key={p.id} producto={p} onZoom={setZoom} onVer={() => navigate(`/productos/${p.id}`)} onEditar={() => abrirEditar(p)} onReestock={() => setAReestockear(p)} onToggleEstado={() => onToggleEstado(p)} onEliminar={() => setAEliminar(p)} />
            ))}
          </div>
          {meta && meta.last_page > 1 && <div className="card"><Pagination meta={meta} page={page} setPage={setPage} /></div>}
        </>
      ) : (
        <div className="card">
          <table className="tbl">
            <thead>
              <tr>
                <th className="num" style={{ width: 48 }}>No.</th>
                <th>Producto</th><th>Marca</th><th className="num">Precio</th><th className="num">Stock</th><th>Estado</th>
                <th style={{ width: 110, textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {productos.map((p, i) => (
                <ProductoFila key={p.id} n={(meta?.from ?? 1) + i} producto={p} onZoom={setZoom} onVer={() => navigate(`/productos/${p.id}`)} onEditar={() => abrirEditar(p)} onReestock={() => setAReestockear(p)} onToggleEstado={() => onToggleEstado(p)} onEliminar={() => setAEliminar(p)} />
              ))}
            </tbody>
          </table>
          {meta && meta.last_page > 1 && <Pagination meta={meta} page={page} setPage={setPage} />}
        </div>
      )}

      <ConfirmDialog
        open={!!aEliminar}
        onOpenChange={(o) => !o && setAEliminar(null)}
        title="Eliminar producto"
        description={aEliminar ? `¿Eliminar "${aEliminar.nombre}"? Podrás restaurarlo, pero desaparecerá del catálogo.` : ''}
        confirmLabel="Eliminar"
        danger
        loading={eliminar.isPending}
        onConfirm={() => aEliminar && eliminar.mutate(aEliminar.id)}
      />

      <ProductoForm open={formOpen} onClose={() => setFormOpen(false)} producto={productoEditar} />
      <AjustarStock open={!!aReestockear} onClose={() => setAReestockear(null)} producto={aReestockear} />
      <Lightbox src={zoom} onClose={() => setZoom(null)} />
    </>
  )
}

// ── Helpers compartidos ─────────────────────────────────────────────────────

function imagenDe(p: Producto): string | undefined {
  const img = p.imagenes?.find((i) => i.es_principal) ?? p.imagenes?.[0]
  return img?.url_thumb ?? img?.url_medium ?? img?.url
}

function imagenGrande(p: Producto): string | undefined {
  const img = p.imagenes?.find((i) => i.es_principal) ?? p.imagenes?.[0]
  return img?.url ?? img?.url_medium ?? img?.url_thumb
}

function tonoStock(p: Producto): 'neg' | 'warn' | 'pos' {
  if (p.stock <= 0) return 'neg'
  if (p.stock <= p.stock_minimo) return 'warn'
  return 'pos'
}

function RowActions({ activo, onVer, onEdit, onRestock, onToggle, onDelete }: {
  activo: boolean; onVer?: () => void; onEdit: () => void; onRestock: () => void; onToggle: () => void; onDelete: () => void
}) {
  return (
    <div className="row-actions">
      {onVer && <button className="icon-action" data-variant="view" title="Ver detalle" onClick={onVer}><Eye /></button>}
      <button className="icon-action" data-variant="stock" title="Ajustar stock" onClick={onRestock}><PackagePlus /></button>
      <button className="icon-action" data-variant="edit" title="Editar" onClick={onEdit}><Pencil /></button>
      {activo
        ? <button className="icon-action" data-variant="toggle" title="Desactivar" onClick={onToggle}><Ban /></button>
        : <button className="icon-action" data-variant="activate" title="Activar" onClick={onToggle}><CheckCircle2 /></button>}
      <button className="icon-action" data-variant="delete" title="Eliminar" onClick={onDelete}><Trash2 /></button>
    </div>
  )
}

// ── Fila de tabla ───────────────────────────────────────────────────────────

function ProductoFila({ n, producto, onZoom, onVer, onEditar, onReestock, onToggleEstado, onEliminar }: {
  n: number; producto: Producto; onZoom: (url: string) => void; onVer: () => void; onEditar: () => void; onReestock: () => void; onToggleEstado: () => void; onEliminar: () => void
}) {
  const thumb = imagenDe(producto)
  const grande = imagenGrande(producto)
  const activo = producto.estado === 'activo'

  return (
    <tr style={{ cursor: 'pointer' }} onClick={onVer}>
      <td className="num muted tnum">{n}</td>
      <td>
        <div className="cell-prod">
          <span className={'cell-thumb' + (grande ? ' img-zoom' : '')} onClick={grande ? (e) => { e.stopPropagation(); onZoom(grande) } : undefined}>{thumb ? <img src={thumb} alt="" /> : <I.Package size={16} />}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 500 }}>{producto.nombre}</div>
            <div className="muted" style={{ fontSize: 11.5, marginTop: 1 }}>{producto.sku}</div>
          </div>
        </div>
      </td>
      <td className="muted">{producto.marca ?? '—'}</td>
      <td className="num">
        {producto.precio_oferta ? (
          <>
            <div className="tnum" style={{ fontWeight: 600, color: 'var(--pos)' }}>{q(producto.precio_oferta)}</div>
            <div className="tnum muted" style={{ fontSize: 11, textDecoration: 'line-through' }}>{q(producto.precio_venta)}</div>
          </>
        ) : (
          <span className="tnum" style={{ fontWeight: 600 }}>{q(producto.precio_venta)}</span>
        )}
      </td>
      <td className="num"><span className="badge" data-tone={tonoStock(producto)}><span className="b-dot" />{producto.stock}</span></td>
      <td><span className="badge" data-tone={activo ? 'pos' : undefined}><span className="b-dot" />{activo ? 'Activo' : 'Inactivo'}</span></td>
      <td onClick={(e) => e.stopPropagation()}><RowActions activo={activo} onVer={onVer} onEdit={onEditar} onRestock={onReestock} onToggle={onToggleEstado} onDelete={onEliminar} /></td>
    </tr>
  )
}

// ── Card ────────────────────────────────────────────────────────────────────

function ProductoCard({ producto, onZoom, onVer, onEditar, onReestock, onToggleEstado, onEliminar }: {
  producto: Producto; onZoom: (url: string) => void; onVer: () => void; onEditar: () => void; onReestock: () => void; onToggleEstado: () => void; onEliminar: () => void
}) {
  const thumb = imagenDe(producto)
  const grande = imagenGrande(producto)
  const activo = producto.estado === 'activo'
  const dcto = producto.precio_oferta
    ? Math.round(((producto.precio_venta - producto.precio_oferta) / producto.precio_venta) * 100)
    : 0

  return (
    <div className="pcard" style={{ cursor: 'pointer' }} onClick={onVer}>
      <div className={'pcard-img' + (grande ? ' img-zoom' : '')} onClick={grande ? (e) => { e.stopPropagation(); onZoom(grande) } : undefined}>
        {thumb ? <img src={thumb} alt="" /> : <I.Package size={28} />}
        {dcto > 0 && <span className="pcard-oferta">-{dcto}%</span>}
        <span className="pcard-badge badge" data-tone={activo ? 'pos' : undefined}><span className="b-dot" />{activo ? 'Activo' : 'Inactivo'}</span>
      </div>
      <div className="pcard-body">
        <div className="pcard-sku">{producto.sku}</div>
        <div className="pcard-name">{producto.nombre}</div>
        <div className="pcard-meta">{producto.marca ?? 'Sin marca'}{producto.color ? ` · ${producto.color}` : ''}</div>
        {producto.categorias?.length > 0 && (
          <div className="pcard-cats">
            {producto.categorias.slice(0, 2).map((c) => <span key={c.id} className="badge">{c.nombre}</span>)}
            {producto.categorias.length > 2 && <span className="badge">+{producto.categorias.length - 2}</span>}
          </div>
        )}
        <div className="pcard-bottom">
          <div className="pcard-price tnum">
            {producto.precio_oferta ? (
              <>
                <span style={{ color: 'var(--pos)' }}>{q(producto.precio_oferta)}</span>
                <span className="old">{q(producto.precio_venta)}</span>
              </>
            ) : q(producto.precio_venta)}
          </div>
          <span className="badge" data-tone={tonoStock(producto)}><span className="b-dot" />{producto.stock} uds</span>
        </div>
      </div>
      <div className="pcard-foot" onClick={(e) => e.stopPropagation()}>
        <span className="loc">
          {producto.ubicacion ? <><I.Tag /><span>{producto.ubicacion}</span></> : <span>&nbsp;</span>}
        </span>
        <RowActions activo={activo} onVer={onVer} onEdit={onEditar} onRestock={onReestock} onToggle={onToggleEstado} onDelete={onEliminar} />
      </div>
    </div>
  )
}

// ── Paginación ──────────────────────────────────────────────────────────────

function Pagination({ meta, page, setPage }: {
  meta: Paginado<Producto>; page: number; setPage: (fn: (p: number) => number) => void
}) {
  return (
    <div className="pagination">
      <span>{meta.from}–{meta.to} de {fmtN(meta.total)}</span>
      <div className="pages">
        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><I.Chevron style={{ transform: 'rotate(180deg)' }} /></button>
        <span style={{ padding: '0 6px' }}>Página {meta.current_page} de {meta.last_page}</span>
        <button disabled={page >= meta.last_page} onClick={() => setPage((p) => p + 1)}><I.Chevron /></button>
      </div>
    </div>
  )
}
