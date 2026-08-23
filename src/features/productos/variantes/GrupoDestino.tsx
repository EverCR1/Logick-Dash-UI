import { useQuery } from '@tanstack/react-query'
import { Loader2, Link2 } from 'lucide-react'
import { productosApi } from '@/lib/api'
import { q } from '@/lib/format'

/**
 * Grupo al que se sumará lo que se está creando, con las variantes que ya tiene.
 *
 * Se muestra al llegar desde "Agregar variante": ahí el grupo ya está decidido,
 * y dejar el buscador de vincular vacío hacía parecer que había que buscarlo de
 * nuevo. Es informativo — el grupo viene de la URL y no se elige aquí.
 */
export function GrupoDestino({ grupo }: { grupo: string }) {
  const { data: hermanas = [], isLoading } = useQuery({
    queryKey: ['productos-grupo', grupo],
    queryFn: () => productosApi.listar({ grupo_variante: grupo, per_page: 100 }).then((r) => r.productos.data),
  })

  return (
    <div className="vinc-box" data-fijado>
      <div className="vinc-title">
        <Link2 size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />
        Se vinculará al grupo <code>{grupo}</code>
      </div>
      <div className="muted" style={{ fontSize: 11.5 }}>
        Ya está enlazado porque llegaste desde una de sus variantes. Lo que crees
        aquí quedará como hermana de las siguientes.
      </div>

      {isLoading ? (
        <div className="muted" style={{ fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Loader2 size={13} className="spin" /> Cargando variantes del grupo…
        </div>
      ) : (
        <div className="vinc-list">
          {hermanas.map((p) => (
            <div key={p.id} className="vinc-item">
              <span className="vinc-thumb">
                {p.imagenes?.[0]?.url_thumb ? <img src={p.imagenes[0].url_thumb} alt="" /> : null}
              </span>
              <div className="vinc-info">
                <div className="vinc-name">{p.nombre_completo || p.nombre}</div>
                <div className="muted" style={{ fontSize: 11.5 }}>{p.sku} · {q(p.precio_venta)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
