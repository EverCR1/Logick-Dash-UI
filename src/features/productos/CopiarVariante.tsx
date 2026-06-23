import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, Search, Copy } from 'lucide-react'
import { productosApi } from '@/lib/api'
import { useDebounce } from '@/lib/hooks'
import type { Producto } from '@/types/producto'

/**
 * Buscar un producto existente y copiar sus datos compartibles para crear una variante.
 * Usa la API existente: /productos?search= y GET /productos/{id}.
 */
export function CopiarVariante({ onCopiar }: { onCopiar: (p: Producto) => void }) {
  const [search, setSearch] = useState('')
  const searchDeb = useDebounce(search)

  const { data: resultados = [], isFetching } = useQuery({
    queryKey: ['copiar-variante-buscar', searchDeb],
    queryFn: async () => (await productosApi.listar({ search: searchDeb, per_page: 10 })).productos.data,
    enabled: searchDeb.trim().length >= 2,
  })

  const copiar = useMutation({
    mutationFn: (id: number) => productosApi.obtener(id),
    onSuccess: (p) => { onCopiar(p); setSearch(''); toast.success('Datos copiados. Falta SKU, precios y stock.') },
    onError: () => toast.error('No se pudieron copiar los datos'),
  })

  const thumb = (p: Producto): string | undefined =>
    p.imagenes?.find((i) => i.es_principal)?.url_thumb ?? p.imagenes?.[0]?.url_thumb ?? undefined

  return (
    <div className="vinc-box" style={{ marginTop: 0, borderTop: 0, paddingTop: 0 }}>
      <div className="vinc-title">Copiar datos de un producto existente</div>
      <div className="muted" style={{ fontSize: 11.5 }}>
        Rellena nombre, descripción, marca, garantía, proveedor y categorías. Solo tendrás que ingresar SKU, precios y stock.
      </div>
      <div className="vinc-search">
        <Search size={14} />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar producto por nombre o SKU…" />
        {(isFetching || copiar.isPending) && <Loader2 size={13} className="spin" style={{ color: 'var(--text-faint)' }} />}
      </div>
      {searchDeb.trim().length >= 2 && (
        <div className="vinc-list">
          {resultados.length === 0 ? (
            <div className="muted" style={{ fontSize: 12.5, padding: '6px 4px' }}>Sin resultados.</div>
          ) : resultados.map((p) => (
            <div key={p.id} className="vinc-item">
              <span className="vinc-thumb">{thumb(p) ? <img src={thumb(p)} alt="" /> : null}</span>
              <div className="vinc-info">
                <div className="vinc-name">{p.nombre}</div>
                <div className="muted" style={{ fontSize: 11.5 }}>{p.sku}{p.grupo_variante ? ` · grupo ${p.grupo_variante}` : ''}</div>
              </div>
              <button type="button" className="btn btn-sm" disabled={copiar.isPending} onClick={() => copiar.mutate(p.id)}><Copy size={13} /> Copiar datos</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
