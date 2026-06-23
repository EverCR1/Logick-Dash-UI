import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Search, Plus, X } from 'lucide-react'
import { productosApi } from '@/lib/api'
import { useDebounce } from '@/lib/hooks'
import { q as money } from '@/lib/format'
import type { Producto } from '@/types/producto'

/**
 * Selecciona productos existentes para vincular al MISMO grupo al guardar el producto nuevo.
 * No hace ningún PUT: solo arma una lista local que el formulario aplica tras crear el producto.
 */
export function VincularEnCreacion({ seleccionados, onChange }: {
  seleccionados: Producto[]; onChange: (list: Producto[]) => void
}) {
  const [search, setSearch] = useState('')
  const searchDeb = useDebounce(search)

  const { data: resultados = [], isFetching } = useQuery({
    queryKey: ['vincular-nuevo-buscar', searchDeb],
    queryFn: async () => (await productosApi.listar({ search: searchDeb, per_page: 10 })).productos.data,
    enabled: searchDeb.trim().length >= 2,
  })

  const yaElegidos = new Set(seleccionados.map((p) => p.id))
  const candidatos = resultados.filter((p) => !yaElegidos.has(p.id))

  const agregar = (p: Producto) => { onChange([...seleccionados, p]); setSearch('') }
  const quitar = (id: number) => onChange(seleccionados.filter((p) => p.id !== id))

  const thumb = (p: Producto): string | undefined =>
    p.imagenes?.find((i) => i.es_principal)?.url_thumb ?? p.imagenes?.[0]?.url_thumb ?? undefined

  return (
    <div className="vinc-box">
      <div className="vinc-title">Vincular otros productos a este grupo</div>
      <div className="muted" style={{ fontSize: 11.5 }}>
        Se agruparán con este producto al guardar. No se modifica nada hasta entonces.
      </div>

      {seleccionados.length > 0 && (
        <div className="vinc-list">
          {seleccionados.map((p) => (
            <div key={p.id} className="vinc-item">
              <span className="vinc-thumb">{thumb(p) ? <img src={thumb(p)} alt="" /> : null}</span>
              <div className="vinc-info">
                <div className="vinc-name">{p.nombre}</div>
                <div className="muted" style={{ fontSize: 11.5 }}>{p.sku}{p.grupo_variante ? ` · cambiará del grupo ${p.grupo_variante}` : ''}</div>
              </div>
              <button type="button" className="icon-action" data-variant="delete" title="Quitar de la lista" onClick={() => quitar(p.id)}><X size={15} /></button>
            </div>
          ))}
        </div>
      )}

      <div className="vinc-search">
        <Search size={14} />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar producto por nombre o SKU…" />
        {isFetching && <Loader2 size={13} className="spin" style={{ color: 'var(--text-faint)' }} />}
      </div>
      {searchDeb.trim().length >= 2 && (
        <div className="vinc-list">
          {candidatos.length === 0 ? (
            <div className="muted" style={{ fontSize: 12.5, padding: '6px 4px' }}>Sin resultados.</div>
          ) : candidatos.map((p) => (
            <div key={p.id} className="vinc-item">
              <span className="vinc-thumb">{thumb(p) ? <img src={thumb(p)} alt="" /> : null}</span>
              <div className="vinc-info">
                <div className="vinc-name">{p.nombre}</div>
                <div className="muted" style={{ fontSize: 11.5 }}>{p.sku}{p.grupo_variante ? ` · grupo ${p.grupo_variante}` : ''} · {money(p.precio_venta)}</div>
              </div>
              <button type="button" className="btn btn-sm" onClick={() => agregar(p)}><Plus size={13} /> Agregar</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
