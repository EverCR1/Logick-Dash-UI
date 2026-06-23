import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, Link2, Link2Off, Search } from 'lucide-react'
import { productosApi } from '@/lib/api'
import { useDebounce } from '@/lib/hooks'
import { q as money } from '@/lib/format'
import type { Producto } from '@/types/producto'

/**
 * Gestiona los productos vinculados a un mismo grupo de variantes.
 * Vincular = asignar el mismo `grupo_variante` (PUT /productos/{id}); todo vía la API existente.
 */
export function VariantesVinculadas({ productoId, sku, grupo, onGrupoChange }: {
  productoId: number; sku: string; grupo: string | null; onGrupoChange: (g: string | null) => void
}) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const searchDeb = useDebounce(search)

  const { data: miembros = [], isFetching: cargandoMiembros } = useQuery({
    queryKey: ['variantes-grupo', grupo],
    queryFn: async () => (await productosApi.listar({ grupo_variante: grupo!, per_page: 50 })).productos.data,
    enabled: !!grupo,
  })

  const { data: resultados = [], isFetching: buscando } = useQuery({
    queryKey: ['variantes-buscar', searchDeb],
    queryFn: async () => (await productosApi.listar({ search: searchDeb, per_page: 10 })).productos.data,
    enabled: searchDeb.trim().length >= 2,
  })

  const refrescar = () => {
    queryClient.invalidateQueries({ queryKey: ['variantes-grupo'] })
    queryClient.invalidateQueries({ queryKey: ['productos'] })
    queryClient.invalidateQueries({ queryKey: ['producto-detalle', productoId] })
  }

  const vincular = useMutation({
    mutationFn: async (otroId: number) => {
      let g = grupo
      if (!g) { g = `grupo-${sku || productoId}`; await productosApi.vincularGrupo(productoId, g) }
      await productosApi.vincularGrupo(otroId, g)
      return g
    },
    onSuccess: (g) => { toast.success('Producto vinculado'); onGrupoChange(g); refrescar() },
    onError: () => toast.error('No se pudo vincular el producto'),
  })

  const desvincular = useMutation({
    mutationFn: (otroId: number) => productosApi.vincularGrupo(otroId, null),
    onSuccess: (_d, otroId) => {
      toast.success('Producto desvinculado')
      if (otroId === productoId) onGrupoChange(null)
      refrescar()
    },
    onError: () => toast.error('No se pudo desvincular el producto'),
  })

  const ocupado = vincular.isPending || desvincular.isPending
  const enGrupo = new Set(miembros.map((m) => m.id))
  const candidatos = resultados.filter((p) => p.id !== productoId && !enGrupo.has(p.id))

  const thumb = (p: Producto): string | undefined =>
    p.imagenes?.find((i) => i.es_principal)?.url_thumb ?? p.imagenes?.[0]?.url_thumb ?? undefined

  return (
    <div className="vinc-box">
      <div className="vinc-title">Productos vinculados a este grupo</div>

      {/* Miembros actuales */}
      {grupo ? (
        cargandoMiembros && miembros.length === 0 ? (
          <div className="muted" style={{ fontSize: 12.5 }}><Loader2 size={13} className="spin" /> Cargando…</div>
        ) : miembros.length === 0 ? (
          <div className="muted" style={{ fontSize: 12.5 }}>Aún no hay productos en el grupo.</div>
        ) : (
          <div className="vinc-list">
            {miembros.map((m) => (
              <div key={m.id} className="vinc-item">
                <span className="vinc-thumb">{thumb(m) ? <img src={thumb(m)} alt="" /> : null}</span>
                <div className="vinc-info">
                  <div className="vinc-name">{m.nombre}{m.id === productoId && <span className="badge" style={{ marginLeft: 6 }}>Este producto</span>}</div>
                  <div className="muted" style={{ fontSize: 11.5 }}>{m.sku}{m.color ? ` · ${m.color}` : ''} · {money(m.precio_venta)}</div>
                </div>
                <button type="button" className="icon-action" data-variant="delete" title="Desvincular" disabled={ocupado} onClick={() => desvincular.mutate(m.id)}><Link2Off /></button>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="muted" style={{ fontSize: 12.5 }}>Este producto aún no pertenece a un grupo. Vincula otro para crearlo.</div>
      )}

      {/* Buscar para vincular */}
      <div className="vinc-search">
        <Search size={14} />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar producto por nombre o SKU para vincular…" />
        {buscando && <Loader2 size={13} className="spin" style={{ color: 'var(--text-faint)' }} />}
      </div>
      {searchDeb.trim().length >= 2 && (
        <div className="vinc-list">
          {candidatos.length === 0 ? (
            <div className="muted" style={{ fontSize: 12.5, padding: '6px 4px' }}>Sin resultados para vincular.</div>
          ) : candidatos.map((p) => (
            <div key={p.id} className="vinc-item">
              <span className="vinc-thumb">{thumb(p) ? <img src={thumb(p)} alt="" /> : null}</span>
              <div className="vinc-info">
                <div className="vinc-name">{p.nombre}</div>
                <div className="muted" style={{ fontSize: 11.5 }}>{p.sku}{p.grupo_variante ? ` · ya en grupo ${p.grupo_variante}` : ''}</div>
              </div>
              <button type="button" className="btn btn-sm" disabled={ocupado} onClick={() => vincular.mutate(p.id)}><Link2 size={13} /> Vincular</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
