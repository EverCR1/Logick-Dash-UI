import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, Eye, Pencil, Trash2, LayoutGrid, List, Ban, CheckCircle2, X, Package, PackagePlus, CheckCircle, AlertTriangle, XCircle, Tag } from 'lucide-react'
import { I } from '@/components/icons'
import { Select } from '@/components/ui/Select'
import { KpiGrid } from '@/components/ui/KpiGrid'
import { MultiSelect } from '@/components/ui/MultiSelect'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Lightbox } from '@/components/ui/Lightbox'
import { BuscadorToolbar } from '@/components/ui/BuscadorToolbar'
import { Pagination } from '@/components/ui/Pagination'
import { AjustarStock } from './AjustarStock'
import { productosApi, catalogosApi } from '@/lib/api'
import { useAutoPageSize } from '@/lib/hooks'
import { q } from '@/lib/format'
import type { Producto, ProductoFiltros } from '@/types/producto'

const PER_PAGE = 15
type Vista = 'tabla' | 'cards'

export default function ProductosPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [estado, setEstado] = useState('todos')
  const [stock, setStock] = useState('todos')
  const [categoriasSel, setCategoriasSel] = useState<number[]>([])
  const [proveedoresSel, setProveedoresSel] = useState<number[]>([])
  const [sort, setSort] = useState('nombre_asc')
  const [page, setPage] = useState(1)
  const [aEliminar, setAEliminar] = useState<Producto | null>(null)
  const [vista, setVista] = useState<Vista>(() => (localStorage.getItem('productos_vista') as Vista) || 'tabla')
  const [zoom, setZoom] = useState<string | null>(null)
  const [aReestockear, setAReestockear] = useState<Producto | null>(null)

  // Capturar grupo_variante del URL si viene desde ProductoDetalle
  const grupoVariante = searchParams.get('grupo_variante')

  // Vista tabla usa PER_PAGE fijo (las filas ocupan todo el ancho, sin huecos).
  // Vista cards calcula cuántas caben según el ancho real, para llenar la página.
  const { ref: cardsRef, perPage: autoPerPage } = useAutoPageSize({ rows: 4 })
  const perPage = vista === 'cards' ? autoPerPage : PER_PAGE

  const abrirNuevo = () => navigate('/productos/nuevo')
  const abrirEditar = (p: Producto) => navigate(`/productos/${p.id}/editar`)

  useEffect(() => { localStorage.setItem('productos_vista', vista) }, [vista])

  useEffect(() => {
    const t = setTimeout(() => { setSearchDebounced(search); setPage(1) }, 350)
    return () => clearTimeout(t)
  }, [search])

  // Si cambia el tamaño de página (cambio de vista o de ancho de ventana), la
  // página actual puede quedar fuera de rango — vuelve a la 1.
  useEffect(() => { setPage(1) }, [perPage])

  const filtros: ProductoFiltros = {
    search: searchDebounced || undefined,
    estado: estado !== 'todos' ? estado : undefined,
    stock: stock !== 'todos' ? stock : undefined,
    categoria_id: categoriasSel.length ? categoriasSel.join(',') : undefined,
    proveedor_id: proveedoresSel.length ? proveedoresSel.join(',') : undefined,
    grupo_variante: grupoVariante || undefined,
    sort: sort !== 'nombre_asc' ? sort : undefined,
    page,
    per_page: perPage,
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

  const { data: proveedores = [] } = useQuery({
    queryKey: ['proveedores-opciones'],
    queryFn: catalogosApi.proveedoresActivos,
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

  // El MultiSelect ya representa "todas" con la lista vacía, así que no lleva
  // una opción explícita para eso; la sangría comunica la jerarquía.
  const opcionesCategoria = categorias.map((c) => ({ value: c.id, label: c.nombre, nivel: c.nivel }))

  const opcionesProveedor = proveedores.map((p) => ({ value: p.id, label: p.nombre }))

  // El botón "Limpiar" solo aparece con 2+ filtros: con uno solo se quita
  // directamente desde su propio control (la X del buscador o volver a "todos").
  const filtrosActivos = [
    !!search, estado !== 'todos', stock !== 'todos',
    categoriasSel.length > 0, proveedoresSel.length > 0, sort !== 'nombre_asc', !!grupoVariante,
  ].filter(Boolean).length

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
        <KpiGrid items={[
          { label: 'Total', value: counts.total, icon: Package, tone: 'accent', sub: 'productos en catálogo', onClick: () => { setEstado('todos'); setPage(1) }, activo: estado === 'todos' },
          { label: 'Activos', value: counts.activos, icon: CheckCircle, tone: 'pos', sub: 'disponibles', onClick: () => { setEstado(estado === 'activo' ? 'todos' : 'activo'); setPage(1) }, activo: estado === 'activo' },
          { label: 'Bajo stock', value: counts.stock_bajo, icon: AlertTriangle, tone: 'warn', sub: 'por reabastecer', onClick: () => { setStock(stock === 'bajo' ? 'todos' : 'bajo'); setPage(1) }, activo: stock === 'bajo' },
          { label: 'Agotados', value: counts.agotados, icon: XCircle, tone: 'neg', sub: 'sin existencias', onClick: () => { setStock(stock === 'agotado' ? 'todos' : 'agotado'); setPage(1) }, activo: stock === 'agotado' },
          { label: 'En oferta', value: counts.en_oferta, icon: Tag, tone: 'violet', sub: 'con descuento' },
        ]} />
      )}

      <div className="toolbar">
        {grupoVariante && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px', borderLeft: '1px solid var(--border)', fontSize: 13 }}>
            <span style={{ color: 'var(--text-secondary)' }}>Grupo: <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{grupoVariante}</span></span>
            <button className="icon-btn" onClick={() => navigate('/productos')} title="Cerrar filtro de grupo"><X size={14} /></button>
          </div>
        )}
        <BuscadorToolbar placeholder="Buscar por nombre, SKU, marca, ubicación…" value={search} onChange={setSearch} cargando={isFetching} />
        <Select value={estado} onValueChange={(v) => { setEstado(v); setPage(1) }} ariaLabel="Estado"
          options={[{ value: 'todos', label: 'Todos los estados' }, { value: 'activo', label: 'Activos' }, { value: 'inactivo', label: 'Inactivos' }]} />
        <Select value={stock} onValueChange={(v) => { setStock(v); setPage(1) }} ariaLabel="Stock"
          options={[{ value: 'todos', label: 'Todo el stock' }, { value: 'disponible', label: 'Con stock' }, { value: 'bajo', label: 'Bajo stock' }, { value: 'agotado', label: 'Agotados' }]} />
        <MultiSelect options={opcionesCategoria} selected={categoriasSel}
          onChange={(ids) => { setCategoriasSel(ids); setPage(1) }}
          placeholder="Todas las categorías" sustantivo="categorías"
          compacto searchable searchPlaceholder="Buscar categoría…" mostrarNivel={false} />
        <MultiSelect options={opcionesProveedor} selected={proveedoresSel}
          onChange={(ids) => { setProveedoresSel(ids); setPage(1) }}
          placeholder="Todos los proveedores" sustantivo="proveedores"
          compacto searchable searchPlaceholder="Buscar proveedor…" mostrarNivel={false} />
        <Select value={sort} onValueChange={(v) => { setSort(v); setPage(1) }} ariaLabel="Ordenar por"
          options={[
            { value: 'nombre_asc', label: 'Nombre A-Z' },
            { value: 'nombre_desc', label: 'Nombre Z-A' },
            { value: 'precio_asc', label: 'Menor precio' },
            { value: 'precio_desc', label: 'Mayor precio' },
            { value: 'stock_desc', label: 'Mayor stock' },
            { value: 'stock_asc', label: 'Menor stock' },
          ]} />
        {filtrosActivos >= 2 && (
          <button className="btn" onClick={() => { setSearch(''); setEstado('todos'); setStock('todos'); setCategoriasSel([]); setProveedoresSel([]); setSort('nombre_asc'); setPage(1); navigate('/productos') }} title="Limpiar filtros"><X size={15} /> Limpiar</button>
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
          <div className="pcards" ref={cardsRef}>
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

      <AjustarStock open={!!aReestockear} onClose={() => setAReestockear(null)} producto={aReestockear} />
      <Lightbox src={zoom} onClose={() => setZoom(null)} />
    </>
  )
}

// ── Helpers compartidos ─────────────────────────────────────────────────────

// Miniatura de tabla (38px): la thumb de ImgBB se ve nítida a ese tamaño
function imagenDe(p: Producto): string | undefined {
  const img = p.imagenes?.find((i) => i.es_principal) ?? p.imagenes?.[0]
  return img?.url_thumb ?? img?.url_medium ?? img?.url
}

// Imagen de card (~220px): usa la mediana/completa; la thumb de 180px se vería
// borrosa al ampliarse (sobre todo en pantallas retina)
function imagenCard(p: Producto): string | undefined {
  const img = p.imagenes?.find((i) => i.es_principal) ?? p.imagenes?.[0]
  return img?.url_medium ?? img?.url ?? img?.url_thumb
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
            <div style={{ fontWeight: 500 }}>{producto.nombre_completo}</div>
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
  const thumb = imagenCard(producto)
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
        <div className="pcard-name">{producto.nombre_completo}</div>
        <div className="pcard-meta">{producto.marca ?? 'Sin marca'}</div>
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

