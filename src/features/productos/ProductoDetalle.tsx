import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Loader2, ChevronsLeft, Pencil, Ban, CheckCircle2, Truck, Barcode, MapPin, ShieldCheck,
  Tag, ShoppingBag, TrendingUp, Boxes, CalendarDays, RefreshCw, AlertCircle, AlertTriangle, Trash2, Package, X, Star, Plus,
} from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { productosApi } from '@/lib/api'
import { q, fmtFecha } from '@/lib/format'
import { invalidarProductos } from '@/lib/cache'
import type { ImagenProducto, Producto } from '@/types/producto'

function imagenPrincipal(p: Producto): ImagenProducto | null {
  if (!p.imagenes?.length) return null
  return p.imagenes.find((i) => i.es_principal) ?? p.imagenes[0]
}

export default function ProductoDetalle() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [confirmarEliminar, setConfirmarEliminar] = useState(false)
  const [lightbox, setLightbox] = useState<string | null>(null)

  const { data: p, isLoading, isError, refetch } = useQuery({
    queryKey: ['producto', id],
    queryFn: () => productosApi.obtener(Number(id)),
    enabled: !!id,
  })

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ['producto', id] })
    invalidarProductos(queryClient)
  }
  const cambiarEstado = useMutation({
    mutationFn: (estado: 'activo' | 'inactivo') => productosApi.cambiarEstado(Number(id), estado),
    onSuccess: () => { toast.success('Estado actualizado'); invalidar() },
    onError: () => toast.error('No se pudo cambiar el estado'),
  })
  const eliminar = useMutation({
    mutationFn: () => productosApi.eliminar(Number(id)),
    onSuccess: () => { toast.success('Producto eliminado'); invalidarProductos(queryClient); navigate('/productos') },
    onError: () => toast.error('No se pudo eliminar el producto'),
  })

  if (isLoading) {
    return <div className="empty" style={{ padding: 120 }}><Loader2 size={26} className="spin" style={{ color: 'var(--accent)' }} /><div>Cargando producto…</div></div>
  }
  if (isError || !p) {
    return (
      <div className="empty" style={{ padding: 120 }}>
        <AlertCircle /><div style={{ marginTop: 8 }}>No se pudo cargar el producto</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button className="btn" onClick={() => navigate('/productos')}><ChevronsLeft size={15} /> Productos</button>
          <button className="btn btn-primary" onClick={() => refetch()}><RefreshCw size={15} /> Reintentar</button>
        </div>
      </div>
    )
  }

  const activo = p.estado === 'activo'
  const img = imagenPrincipal(p)
  const imgUrl = img?.url ?? img?.url_medium ?? img?.url_thumb ?? null
  const precioFinal = p.precio_oferta ?? p.precio_venta
  const margen = p.precio_compra > 0 ? ((precioFinal - p.precio_compra) / p.precio_compra) * 100 : 0
  const margenTone = margen >= 30 ? 'pos' : margen >= 15 ? 'warn' : 'neg'
  const stockTone = p.stock <= p.stock_minimo ? 'neg' : p.stock <= p.stock_minimo * 2 ? 'warn' : 'pos'
  const stockBajo = p.stock <= p.stock_minimo

  return (
    <>
      <div className="page-head" style={{ alignItems: 'center' }}>
        <button className="back-link" onClick={() => navigate('/productos')}><ChevronsLeft /> Productos</button>
        <div className="hero-actions">
          <button className="btn" disabled={cambiarEstado.isPending} onClick={() => cambiarEstado.mutate(activo ? 'inactivo' : 'activo')}>
            {activo ? <><Ban size={15} /> Desactivar</> : <><CheckCircle2 size={15} /> Activar</>}
          </button>
          <button className="btn btn-primary" onClick={() => navigate(`/productos/${p.id}/editar`)}><Pencil size={15} /> Editar producto</button>
        </div>
      </div>

      {/* Hero */}
      <div className="card prod-hero">
        <div className="prod-hero-img" onClick={() => imgUrl && setLightbox(imgUrl)} data-clickable={!!imgUrl}>
          {imgUrl ? <img src={imgUrl} alt={p.nombre} /> : <Package size={40} />}
          {(p.imagenes?.length ?? 0) > 1 && <span className="prod-hero-count">{p.imagenes.length} imgs</span>}
        </div>
        <div className="prod-hero-info">
          <div className="prod-hero-sku">{p.sku}</div>
          <div className="prod-hero-name">{p.nombre_completo}</div>
          {p.marca && <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>{p.marca}</div>}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '10px 0' }}>
            <span className="badge" data-tone={activo ? 'pos' : undefined}><span className="b-dot" />{activo ? 'Activo' : 'Inactivo'}</span>
            {p.categorias?.map((c) => <span key={c.id} className="badge">{c.nombre}</span>)}
          </div>
          {p.descripcion && <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, margin: '0 0 12px' }}>{p.descripcion}</p>}
          <div className="prod-meta-grid">
            <Meta icon={<Truck />} label="Proveedor" value={p.proveedor?.nombre ?? 'N/A'} />
            <Meta icon={<Barcode />} label="Cód. barras" value={p.codigo_barras ?? '—'} />
            <Meta icon={<MapPin />} label="Ubicación" value={p.ubicacion ?? '—'} />
            <Meta icon={<ShieldCheck />} label="Garantía" value={p.garantia ?? 'Sin garantía'} />
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid">
        <div className="kpi">
          <div className="kpi-row1"><div className="kpi-label">Precio de venta</div><div className="kpi-icon" data-tone="accent"><Tag /></div></div>
          <div className="kpi-value tnum"><span className="currency">Q</span>{fmtMon(p.precio_venta)}</div>
          <div className="kpi-meta"><span>{p.precio_oferta ? `Oferta: ${q(p.precio_oferta)}` : 'sin oferta'}</span></div>
        </div>
        <div className="kpi">
          <div className="kpi-row1"><div className="kpi-label">Precio de compra</div><div className="kpi-icon" data-tone="info"><ShoppingBag /></div></div>
          <div className="kpi-value tnum"><span className="currency">Q</span>{fmtMon(p.precio_compra)}</div>
          <div className="kpi-meta"><span>costo unitario</span></div>
        </div>
        <div className="kpi">
          <div className="kpi-row1"><div className="kpi-label">Margen</div><div className="kpi-icon" data-tone={margenTone}><TrendingUp /></div></div>
          <div className="kpi-value tnum" style={{ color: `var(--${margenTone})` }}>{margen.toFixed(1)}%</div>
          <div className="kpi-meta"><span>{q(precioFinal - p.precio_compra)} por unidad</span></div>
        </div>
        <div className="kpi">
          <div className="kpi-row1"><div className="kpi-label">Stock disponible</div><div className="kpi-icon" data-tone={stockTone}><Boxes /></div></div>
          <div className="kpi-value tnum" style={{ color: `var(--${stockTone})` }}>{p.stock}</div>
          <div className="kpi-meta"><span>mínimo: {p.stock_minimo} uds</span></div>
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-col">
          <DetailTabs p={p} onImg={setLightbox} />
        </div>

        <div className="detail-col">
          <div className="card">
            <div className="card-header"><div className="card-title"><AlertCircle size={15} style={{ color: 'var(--text-muted)' }} />Registro</div></div>
            <div className="timeline">
              <TlItem icon={<CalendarDays />} label="Creado" value={p.created_at ? fmtFecha(p.created_at, true) : '—'} />
              <TlItem icon={<RefreshCw />} label="Actualizado" value={p.updated_at ? fmtFecha(p.updated_at, true) : '—'} />
            </div>
          </div>


          {stockBajo && (
            <div className="card" style={{ borderColor: 'color-mix(in oklch, var(--neg) 35%, transparent)' }}>
              <div className="action-list">
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <AlertTriangle size={18} style={{ color: 'var(--neg)', flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--neg)' }}>Stock bajo</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Quedan {p.stock} uds, el mínimo es {p.stock_minimo}.</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-header"><div className="card-title"><AlertCircle size={15} style={{ color: 'var(--neg)' }} />Zona de riesgo</div></div>
            <div className="action-list">
              <button className="action-btn" data-variant="danger" onClick={() => setConfirmarEliminar(true)}><Trash2 /> Eliminar producto</button>
              <div style={{ fontSize: 11.5, color: 'var(--text-faint)', padding: '0 2px', lineHeight: 1.5 }}>
                Podrás restaurarlo, pero desaparecerá del catálogo.
              </div>
            </div>
          </div>
        </div>
      </div>

      {lightbox && (
        <div onClick={() => setLightbox(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 95, background: 'rgba(0,0,0,.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <button className="icon-btn" onClick={() => setLightbox(null)} style={{ position: 'absolute', top: 16, right: 16, color: '#fff', width: 36, height: 36 }}><X size={20} /></button>
          <img src={lightbox} alt="" style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: 10 }} onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      <ConfirmDialog open={confirmarEliminar} onOpenChange={setConfirmarEliminar}
        title="Eliminar producto" description={`¿Eliminar "${p.nombre}"? Podrás restaurarlo, pero desaparecerá del catálogo.`}
        confirmLabel="Eliminar" danger loading={eliminar.isPending} onConfirm={() => eliminar.mutate()} />
    </>
  )
}

function fmtMon(n: number): string {
  return Number(n).toLocaleString('es-GT', { minimumFractionDigits: 2 })
}

function DetailTabs({ p, onImg }: { p: Producto; onImg: (url: string) => void }) {
  const navigate = useNavigate()
  const tieneEspec = !!p.especificaciones?.trim()
  const tieneImgs = (p.imagenes?.length ?? 0) > 0
  const tieneVariantes = !!p.grupo_variante
  const [tab, setTab] = useState<'detalles' | 'especificaciones' | 'galeria' | 'variantes'>('detalles')

  const { data: variantes = [] } = useQuery({
    queryKey: ['productos-grupo', p.grupo_variante],
    queryFn: () => productosApi.listar({ grupo_variante: p.grupo_variante || undefined, per_page: 100 }).then(r => r.productos.data),
    enabled: tieneVariantes,
  })

  const TABS = [
    { id: 'detalles' as const, label: 'Detalles' },
    ...(tieneEspec ? [{ id: 'especificaciones' as const, label: 'Especificaciones' }] : []),
    ...(tieneImgs ? [{ id: 'galeria' as const, label: `Galería · ${p.imagenes.length}` }] : []),
    ...(tieneVariantes ? [{ id: 'variantes' as const, label: `Variantes · ${variantes.length}` }] : []),
  ]
  return (
    <div className="card detail-tabs-card">
      <div className="card-header">
        <div className="tabs">
          {TABS.map((t) => <button key={t.id} className="tab" data-active={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</button>)}
        </div>
      </div>

      {tab === 'detalles' && (
        <div className="info-grid">
          <InfoItem icon={<Truck />} label="Proveedor" value={p.proveedor?.nombre} empty="N/A" />
          <InfoItem icon={<Barcode />} label="Código de barras" value={p.codigo_barras} empty="—" />
          <InfoItem icon={<MapPin />} label="Ubicación" value={p.ubicacion} empty="—" />
          <InfoItem icon={<ShieldCheck />} label="Garantía" value={p.garantia} empty="Sin garantía" />
          <InfoItem icon={<Tag />} label="Descripción" value={p.descripcion} empty="Sin descripción" full />
          <InfoItem icon={<AlertCircle />} label="Notas internas" value={p.notas_internas} empty="Sin notas" full />
        </div>
      )}

      {tab === 'especificaciones' && (
        <div style={{ padding: 'var(--pad-card)' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.7, whiteSpace: 'pre-wrap', background: 'var(--bg-elev-2)', border: '1px solid var(--border)', borderRadius: 9, padding: '14px 16px' }}>
            {p.especificaciones}
          </div>
        </div>
      )}

      {tab === 'galeria' && (
        <div style={{ padding: 'var(--pad-card)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12 }}>
            {p.imagenes.map((im) => {
              const thumb = im.url_thumb ?? im.url
              return (
                <div key={im.id} onClick={() => onImg(im.url ?? thumb)}
                  style={{ position: 'relative', aspectRatio: '1', borderRadius: 10, overflow: 'hidden', cursor: 'pointer', border: im.es_principal ? '2px solid var(--accent)' : '1px solid var(--border)' }}>
                  <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  {im.es_principal && (
                    <span style={{ position: 'absolute', top: 6, left: 6, background: 'var(--accent)', color: 'var(--text-on-accent)', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      <Star size={10} /> Principal
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {tab === 'variantes' && (
        <div style={{ padding: 'var(--pad-card)' }}>
          {/* Antes había que ir a "Nuevo producto", buscar un hermano y copiar
              sus datos a mano. El enlace lleva el grupo y el producto modelo. */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
            <span className="muted" style={{ fontSize: 12.5 }}>
              {variantes.length} {variantes.length === 1 ? 'variante' : 'variantes'} en el grupo <code>{p.grupo_variante}</code>
            </span>
            <button className="btn btn-primary btn-sm"
              onClick={() => navigate(`/productos/nuevo?grupo=${encodeURIComponent(p.grupo_variante!)}&desde=${p.id}`)}>
              <Plus size={14} /> Agregar variante
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14 }}>
            {variantes.map((v) => {
              const img = v.imagenes?.find(i => i.es_principal) ?? v.imagenes?.[0]
              const imgThumb = img?.url_thumb ?? img?.url
              return (
                <div key={v.id} onClick={() => navigate(`/productos/${v.id}`)}
                  style={{
                    cursor: 'pointer',
                    padding: 12,
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    backgroundColor: 'var(--bg-elev-2)',
                    transition: 'all 200ms',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'
                    ;(e.currentTarget as HTMLElement).style.backgroundColor = 'var(--accent-soft)'
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
                    ;(e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-elev-2)'
                  }}
                >
                  <div style={{ aspectRatio: '1', borderRadius: 8, overflow: 'hidden', backgroundColor: 'var(--bg-elev-1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {imgThumb ? <img src={imgThumb} alt={v.nombre_completo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Package size={28} style={{ color: 'var(--text-faint)' }} />}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.nombre_completo}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{v.sku}</div>
                    <div style={{ marginTop: 8 }}>
                      {v.precio_oferta ? (
                        <>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--pos)' }}>Q{fmtMon(v.precio_oferta)}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', textDecoration: 'line-through', marginTop: 2 }}>Q{fmtMon(v.precio_venta)}</div>
                        </>
                      ) : (
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>Q{fmtMon(v.precio_venta)}</div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function Meta({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="prod-meta-item">
      <span className="prod-meta-label">{icon} {label}</span>
      <span className="prod-meta-value">{value}</span>
    </div>
  )
}

function InfoItem({ icon, label, value, empty, full }: { icon: React.ReactNode; label: string; value?: string | null; empty?: string; full?: boolean }) {
  return (
    <div className={'info-item' + (full ? ' full' : '')}>
      <div className="il">{icon} {label}</div>
      <div className={'iv' + (value ? '' : ' empty')}>{value || empty || '—'}</div>
    </div>
  )
}

function TlItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="tl-item">
      <span className="tl-dot" />
      <div>
        <div className="tl-label">{icon} {label}</div>
        <div className="tl-value">{value}</div>
      </div>
    </div>
  )
}
