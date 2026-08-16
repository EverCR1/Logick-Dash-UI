import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, Pencil, Trash2, Plus, ChevronRight, Network, LayoutGrid, List, X } from 'lucide-react'
import { I } from '@/components/icons'
import { Select } from '@/components/ui/Select'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pagination } from '@/components/ui/Pagination'
import { BuscadorToolbar } from '@/components/ui/BuscadorToolbar'
import { Lightbox } from '@/components/ui/Lightbox'
import { CategoriaForm } from './CategoriaForm'
import { categoriasApi } from '@/lib/api'
import { useDebounce } from '@/lib/hooks'
import { fmtN } from '@/lib/format'
import type { Categoria, CategoriaArbol, CategoriaFiltros } from '@/types/categoria'

const PER_PAGE = 20
type Vista = 'arbol' | 'cards' | 'tabla'
const NIVEL_COLORES = ['#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899']

// Convierte un nodo del árbol al tipo Categoria para reusar el form de edición
function aCategoria(n: CategoriaArbol): Categoria {
  return { id: n.id, nombre: n.nombre, descripcion: n.descripcion, parent_id: n.parent_id, parent: null, estado: n.estado, imagen: n.imagen }
}

/**
 * Filtra el árbol por texto y estado conservando la jerarquía: un nodo se mantiene
 * si coincide o si alguno de sus descendientes coincide.
 */
function filtrarArbol(nodos: CategoriaArbol[], texto: string, estado: string): CategoriaArbol[] {
  const out: CategoriaArbol[] = []
  for (const n of nodos) {
    const hijos = filtrarArbol(n.children_recursive ?? [], texto, estado)
    const okTexto = !texto || n.nombre.toLowerCase().includes(texto) || (n.descripcion ?? '').toLowerCase().includes(texto)
    const okEstado = estado === 'todos' || n.estado === estado
    if ((okTexto && okEstado) || hijos.length > 0) {
      out.push({ ...n, children_recursive: hijos })
    }
  }
  return out
}

export default function CategoriasPage() {
  const queryClient = useQueryClient()
  const [vista, setVista] = useState<Vista>(() => (localStorage.getItem('categorias_vista') as Vista) || 'arbol')
  useEffect(() => { localStorage.setItem('categorias_vista', vista) }, [vista])

  const [search, setSearch] = useState('')
  const searchDebounced = useDebounce(search)
  const [estado, setEstado] = useState('todos')
  const [page, setPage] = useState(1)
  const [aEliminar, setAEliminar] = useState<Categoria | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editar, setEditar] = useState<Categoria | null>(null)
  const [parentInicial, setParentInicial] = useState<number | null>(null)
  const [zoom, setZoom] = useState<string | null>(null)

  // Árbol y cards usan el árbol completo; la tabla usa el listado paginado.
  // Se carga siempre para alimentar los KPIs del encabezado.
  const arbolQuery = useQuery({ queryKey: ['categorias-arbol'], queryFn: categoriasApi.arbol })

  const filtros: CategoriaFiltros = { search: searchDebounced || undefined, estado: estado !== 'todos' ? estado : undefined, page, per_page: PER_PAGE }
  const tablaQuery = useQuery({
    queryKey: ['categorias', filtros], queryFn: () => categoriasApi.listar(filtros),
    placeholderData: keepPreviousData, enabled: vista === 'tabla',
  })

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ['categorias'] })
    queryClient.invalidateQueries({ queryKey: ['categorias-arbol'] })
  }

  const eliminar = useMutation({
    mutationFn: (id: number) => categoriasApi.eliminar(id),
    onSuccess: () => { toast.success('Categoría eliminada'); setAEliminar(null); invalidar() },
    onError: () => toast.error('No se pudo eliminar la categoría'),
  })
  const cambiarEstado = useMutation({
    mutationFn: ({ id, estado }: { id: number; estado: 'activo' | 'inactivo' }) => categoriasApi.cambiarEstado(id, estado),
    onSuccess: () => { toast.success('Estado actualizado'); invalidar() },
    onError: () => toast.error('No se pudo cambiar el estado'),
  })

  const abrirNuevo = (parent: number | null = null) => { setEditar(null); setParentInicial(parent); setFormOpen(true) }
  const abrirEditar = (c: Categoria) => { setEditar(c); setParentInicial(null); setFormOpen(true) }

  // Filtro client-side para árbol/cards (la tabla filtra en el servidor)
  const arbolFiltrado = useMemo(
    () => filtrarArbol(arbolQuery.data ?? [], searchDebounced.toLowerCase().trim(), estado),
    [arbolQuery.data, searchDebounced, estado],
  )

  // Conteos para los KPIs (sobre el árbol completo, sin filtrar)
  const totales = useMemo(() => {
    let total = 0, raiz = 0, activas = 0, inactivas = 0
    const walk = (nodos: CategoriaArbol[], nivel = 0) => {
      for (const n of nodos) {
        total++; if (nivel === 0) raiz++
        if (n.estado === 'activo') activas++; else inactivas++
        walk(n.children_recursive ?? [], nivel + 1)
      }
    }
    walk(arbolQuery.data ?? [])
    return { total, raiz, activas, inactivas }
  }, [arbolQuery.data])

  // El boton "Limpiar" solo aparece con 2+ filtros: con uno solo se quita
  // directamente desde su propio control (la X del buscador o volver a "todos").
  const filtrosActivos = [!!search, estado !== 'todos'].filter(Boolean).length
  const hayFiltros = filtrosActivos >= 2
  const limpiarFiltros = () => { setSearch(''); setEstado('todos'); setPage(1) }

  const acciones = { onEditar: abrirEditar, onSub: abrirNuevo, onToggle: (c: Categoria) => cambiarEstado.mutate({ id: c.id, estado: c.estado === 'activo' ? 'inactivo' : 'activo' }), onEliminar: setAEliminar, onZoom: setZoom }

  return (
    <>
      <PageHeader title="Categorías" subtitle="Organiza tu catálogo en jerarquías"
        action={<button className="btn btn-primary" onClick={() => abrirNuevo(null)}><I.Plus /> Nueva categoría</button>} />

      {arbolQuery.data && (
        <div className="kpi-grid">
          {[
            { label: 'Total', value: totales.total, icon: I.Layers, tone: 'accent' as const, sub: 'categorías' },
            { label: 'Nivel 0', value: totales.raiz, icon: Network, tone: 'info' as const, sub: 'categorías raíz' },
            { label: 'Activas', value: totales.activas, icon: I.CheckCircle, tone: 'pos' as const, sub: 'visibles' },
            { label: 'Inactivas', value: totales.inactivas, icon: I.Ban, tone: 'neg' as const, sub: 'ocultas' },
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
        <BuscadorToolbar placeholder="Buscar categoría…" value={search} onChange={(v) => { setSearch(v); setPage(1) }} />
        <Select value={estado} onValueChange={(v) => { setEstado(v); setPage(1) }} ariaLabel="Estado"
          options={[{ value: 'todos', label: 'Todos los estados' }, { value: 'activo', label: 'Activos' }, { value: 'inactivo', label: 'Inactivos' }]} />
        {hayFiltros && <button className="btn" onClick={limpiarFiltros} title="Limpiar filtros"><X size={15} /> Limpiar</button>}
        <div className="view-toggle" style={{ marginLeft: 'auto' }}>
          <button data-on={vista === 'arbol'} onClick={() => setVista('arbol')} title="Vista de árbol"><Network /></button>
          <button data-on={vista === 'cards'} onClick={() => setVista('cards')} title="Vista de tarjetas"><LayoutGrid /></button>
          <button data-on={vista === 'tabla'} onClick={() => setVista('tabla')} title="Vista de tabla"><List /></button>
        </div>
      </div>

      {vista === 'tabla'
        ? <VistaTabla query={tablaQuery} page={page} setPage={setPage} acciones={acciones} />
        : <VistaArbolOCards vista={vista} arbol={arbolFiltrado} query={arbolQuery} acciones={acciones} />}

      <ConfirmDialog open={!!aEliminar} onOpenChange={(o) => !o && setAEliminar(null)}
        title="Eliminar categoría" description={aEliminar ? `¿Eliminar "${aEliminar.nombre}"? Las subcategorías quedarían sin padre.` : ''}
        confirmLabel="Eliminar" danger loading={eliminar.isPending}
        onConfirm={() => aEliminar && eliminar.mutate(aEliminar.id)} />

      <CategoriaForm open={formOpen} onClose={() => setFormOpen(false)} categoria={editar} parentInicial={parentInicial} />
      <Lightbox src={zoom} onClose={() => setZoom(null)} />
    </>
  )
}

interface Acciones {
  onEditar: (c: Categoria) => void
  onSub: (parent: number) => void
  onToggle: (c: Categoria) => void
  onEliminar: (c: Categoria) => void
  onZoom: (url: string) => void
}

// ── Acciones de fila (compartido) ────────────────────────────────────────────
function NodeActions({ cat, acciones }: { cat: Categoria; acciones: Acciones }) {
  const activo = cat.estado === 'activo'
  return (
    <div className="row-actions" onClick={(e) => e.stopPropagation()}>
      <button className="icon-action" data-variant="view" title="Agregar subcategoría" onClick={() => acciones.onSub(cat.id)}><Plus /></button>
      <button className="icon-action" data-variant="edit" title="Editar" onClick={() => acciones.onEditar(cat)}><Pencil /></button>
      {activo
        ? <button className="icon-action" data-variant="toggle" title="Desactivar" onClick={() => acciones.onToggle(cat)}><I.Ban /></button>
        : <button className="icon-action" data-variant="activate" title="Activar" onClick={() => acciones.onToggle(cat)}><I.CheckCircle /></button>}
      <button className="icon-action" data-variant="delete" title="Eliminar" onClick={() => acciones.onEliminar(cat)}><Trash2 /></button>
    </div>
  )
}

// ── Vista árbol / cards ──────────────────────────────────────────────────────
function VistaArbolOCards({ vista, arbol, query, acciones }: {
  vista: 'arbol' | 'cards'; arbol: CategoriaArbol[]; query: ReturnType<typeof useQuery<CategoriaArbol[]>>; acciones: Acciones
}) {
  const { isLoading, isError, refetch } = query
  if (isLoading) return <div className="card"><div className="empty" style={{ padding: 80 }}><Loader2 size={26} className="spin" style={{ color: 'var(--accent)' }} /><div>Cargando…</div></div></div>
  if (isError) return <div className="card"><div className="empty" style={{ padding: 80 }}><I.AlertCircle /><div>No se pudieron cargar las categorías</div><button className="btn" style={{ marginTop: 10 }} onClick={() => refetch()}><I.Refresh /> Reintentar</button></div></div>
  if (arbol.length === 0) return <div className="card"><div className="empty" style={{ padding: 80 }}><I.Layers /><div>No se encontraron categorías con esos filtros</div></div></div>

  if (vista === 'arbol') {
    return <div className="card"><div className="cat-tree">{arbol.map((n) => <TreeNode key={n.id} nodo={n} nivel={0} acciones={acciones} />)}</div></div>
  }

  // Cards: aplanar el árbol con nivel y conteo de hijos
  const flat: { nodo: CategoriaArbol; nivel: number; kids: number }[] = []
  const aplanar = (nodos: CategoriaArbol[], nivel = 0) => {
    for (const n of nodos) {
      const hijos = n.children_recursive ?? []
      flat.push({ nodo: n, nivel, kids: hijos.length })
      aplanar(hijos, nivel + 1)
    }
  }
  aplanar(arbol)

  return (
    <div className="cat-cards">
      {flat.map(({ nodo, nivel, kids }) => {
        const color = NIVEL_COLORES[nivel % NIVEL_COLORES.length]
        const thumb = nodo.imagen?.url_thumb ?? nodo.imagen?.url_medium ?? nodo.imagen?.url
        const grande = nodo.imagen?.url ?? nodo.imagen?.url_medium ?? nodo.imagen?.url_thumb
        const activo = nodo.estado === 'activo'
        return (
          <div key={nodo.id} className="cat-card" onClick={() => acciones.onEditar(aCategoria(nodo))}>
            <div className="cat-card-head">
              <div className={'cat-card-ico' + (grande ? ' img-zoom' : '')} style={{ color, background: `${color}1f` }} onClick={grande ? (e) => { e.stopPropagation(); acciones.onZoom(grande) } : undefined}>
                {thumb ? <img src={thumb} alt="" /> : <I.Tag size={18} />}
              </div>
              <div className="cat-card-id">
                <div className="cat-card-name">{nodo.nombre}</div>
                <div className="cat-card-level" style={{ color }}>{nivel === 0 ? 'Categoría raíz' : `Nivel ${nivel}`}</div>
              </div>
              <span className="badge" data-tone={activo ? 'pos' : undefined}><span className="b-dot" />{activo ? 'Activa' : 'Inactiva'}</span>
            </div>
            {nodo.descripcion && <div className="cat-card-desc">{nodo.descripcion}</div>}
            <div className="cat-card-foot">
              <span className="badge">{kids > 0 ? `${kids} sub${kids > 1 ? 's' : ''}` : 'Sin subcategorías'}</span>
              <NodeActions cat={aCategoria(nodo)} acciones={acciones} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Nodo recursivo del árbol ─────────────────────────────────────────────────
function TreeNode({ nodo, nivel, acciones }: { nodo: CategoriaArbol; nivel: number; acciones: Acciones }) {
  const [open, setOpen] = useState(true)
  const hijos = nodo.children_recursive ?? []
  const tieneHijos = hijos.length > 0
  const color = NIVEL_COLORES[nivel % NIVEL_COLORES.length]
  const thumb = nodo.imagen?.url_thumb ?? nodo.imagen?.url_medium ?? nodo.imagen?.url
  const grande = nodo.imagen?.url ?? nodo.imagen?.url_medium ?? nodo.imagen?.url_thumb
  const activo = nodo.estado === 'activo'

  return (
    <div>
      <div className="cat-node" data-inactivo={!activo}>
        {tieneHijos ? (
          <button className="cat-toggle" data-open={open} onClick={() => setOpen((o) => !o)} title="Expandir/Colapsar"><ChevronRight size={15} /></button>
        ) : <span className="cat-toggle placeholder" />}
        <span className={'cat-thumb' + (grande ? ' img-zoom' : '')} style={{ borderColor: `${color}55` }} onClick={grande ? (e) => { e.stopPropagation(); acciones.onZoom(grande) } : undefined}>
          {thumb ? <img src={thumb} alt="" /> : <I.Tag size={15} style={{ color }} />}
        </span>
        <div className="cat-node-info">
          <div className="cat-node-name">{nodo.nombre}</div>
          {nodo.descripcion && <div className="cat-node-desc">{nodo.descripcion}</div>}
          <div className="cat-node-badges">
            <span className="badge" data-tone={activo ? 'pos' : undefined}><span className="b-dot" />{activo ? 'Activa' : 'Inactiva'}</span>
            {tieneHijos && <span className="badge">{hijos.length} sub{hijos.length > 1 ? 's' : ''}</span>}
          </div>
        </div>
        <NodeActions cat={aCategoria(nodo)} acciones={acciones} />
      </div>
      {tieneHijos && open && (
        <div className="cat-tree-children">
          {hijos.map((h) => <TreeNode key={h.id} nodo={h} nivel={nivel + 1} acciones={acciones} />)}
        </div>
      )}
    </div>
  )
}

// ── Vista tabla ──────────────────────────────────────────────────────────────
function VistaTabla({ query, page, setPage, acciones }: {
  query: ReturnType<typeof useQuery<import('@/types/categoria').CategoriasResponse>>
  page: number; setPage: (fn: (p: number) => number) => void; acciones: Acciones
}) {
  const { data, isLoading, isError, refetch } = query
  const categorias = data?.categorias.data ?? []
  const meta = data?.categorias

  return (
    <div className="card">
      {isLoading ? (
        <div className="empty" style={{ padding: 80 }}><Loader2 size={26} className="spin" style={{ color: 'var(--accent)' }} /><div>Cargando…</div></div>
      ) : isError ? (
        <div className="empty" style={{ padding: 80 }}><I.AlertCircle /><div>No se pudieron cargar las categorías</div><button className="btn" style={{ marginTop: 10 }} onClick={() => refetch()}><I.Refresh /> Reintentar</button></div>
      ) : categorias.length === 0 ? (
        <div className="empty" style={{ padding: 80 }}><I.Layers /><div>No se encontraron categorías</div></div>
      ) : (
        <>
          <table className="tbl">
            <thead><tr><th className="num" style={{ width: 48 }}>No.</th><th>Categoría</th><th>Categoría padre</th><th>Estado</th><th style={{ width: 140, textAlign: 'right' }}>Acciones</th></tr></thead>
            <tbody>
              {categorias.map((c, i) => {
                const activo = c.estado === 'activo'
                return (
                  <tr key={c.id}>
                    <td className="num muted tnum">{(meta?.from ?? 1) + i}</td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{c.nombre}</div>
                      {c.descripcion && <div className="muted" style={{ fontSize: 11.5, marginTop: 1 }}>{c.descripcion}</div>}
                    </td>
                    <td className="muted">{c.parent ? c.parent.nombre : <span className="badge">Nivel 0</span>}</td>
                    <td><span className="badge" data-tone={activo ? 'pos' : undefined}><span className="b-dot" />{activo ? 'Activa' : 'Inactiva'}</span></td>
                    <td><NodeActions cat={c} acciones={acciones} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {meta && <Pagination meta={meta} page={page} setPage={setPage} />}
        </>
      )}
    </div>
  )
}
