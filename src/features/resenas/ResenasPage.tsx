import { useState } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, Star, Check, X, RotateCcw } from 'lucide-react'
import { I } from '@/components/icons'
import { Select } from '@/components/ui/Select'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pagination } from '@/components/ui/Pagination'
import { resenasApi } from '@/lib/api'
import { fmtN, fmtFecha } from '@/lib/format'
import type { Resena, ResenaEstado, ResenaFiltros } from '@/types/resena'

const PER_PAGE = 20

const ESTADO_BADGE: Record<ResenaEstado, { label: string; tone?: 'pos' | 'neg' | 'warn' }> = {
  pendiente: { label: 'Pendiente', tone: 'warn' },
  publicado: { label: 'Publicado', tone: 'pos' },
  rechazado: { label: 'Rechazado', tone: 'neg' },
}

function Estrellas({ rating }: { rating: number }) {
  return (
    <div style={{ display: 'inline-flex', gap: 1 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={14} fill={n <= rating ? '#f59e0b' : 'none'} color={n <= rating ? '#f59e0b' : 'var(--border)'} />
      ))}
    </div>
  )
}

function nombreCuenta(c: Resena['cuenta']): string {
  if (!c) return 'Anónimo'
  return [c.nombre, c.apellido].filter(Boolean).join(' ') || c.email
}

export default function ResenasPage() {
  const queryClient = useQueryClient()
  const [estado, setEstado] = useState('todos')
  const [page, setPage] = useState(1)

  const filtros: ResenaFiltros = { estado: estado !== 'todos' ? estado : undefined, page, per_page: PER_PAGE }

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['resenas', filtros],
    queryFn: () => resenasApi.listar(filtros),
    placeholderData: keepPreviousData,
  })

  const cambiar = useMutation({
    mutationFn: ({ id, estado }: { id: number; estado: ResenaEstado }) => resenasApi.cambiarEstado(id, estado),
    onSuccess: () => { toast.success('Estado actualizado'); queryClient.invalidateQueries({ queryKey: ['resenas'] }) },
    onError: () => toast.error('No se pudo actualizar la reseña'),
  })

  const resenas = data?.resenas.data ?? []
  const counts = data?.counts
  const meta = data?.resenas

  return (
    <>
      <PageHeader title="Reseñas" subtitle="Moderación de reseñas de productos" />

      {counts && (
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          {[
            { label: 'Total', value: counts.total, icon: I.Star, tone: 'accent' as const, sub: 'reseñas' },
            { label: 'Pendientes', value: counts.pendiente, icon: I.Clock, tone: 'warn' as const, sub: 'por moderar' },
            { label: 'Publicadas', value: counts.publicado, icon: I.CheckCircle, tone: 'pos' as const, sub: 'visibles' },
            { label: 'Rechazadas', value: counts.rechazado, icon: I.Ban, tone: 'neg' as const, sub: 'ocultas' },
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
        <Select value={estado} onValueChange={(v) => { setEstado(v); setPage(1) }} ariaLabel="Estado"
          options={[
            { value: 'todos', label: 'Todos los estados' },
            { value: 'pendiente', label: 'Pendientes' },
            { value: 'publicado', label: 'Publicadas' },
            { value: 'rechazado', label: 'Rechazadas' },
          ]} />
        {isFetching && <Loader2 size={14} className="spin" style={{ color: 'var(--text-faint)' }} />}
      </div>

      <div className="card">
        {isLoading ? (
          <div className="empty" style={{ padding: 80 }}><Loader2 size={26} className="spin" style={{ color: 'var(--accent)' }} /><div>Cargando…</div></div>
        ) : isError ? (
          <div className="empty" style={{ padding: 80 }}><I.AlertCircle /><div>No se pudieron cargar las reseñas</div>
            <button className="btn" style={{ marginTop: 10 }} onClick={() => refetch()}><I.Refresh /> Reintentar</button></div>
        ) : resenas.length === 0 ? (
          <div className="empty" style={{ padding: 80 }}><I.Star /><div>No hay reseñas con esos filtros</div></div>
        ) : (
          <>
            <table className="tbl">
              <thead><tr>
                <th className="num" style={{ width: 48 }}>No.</th>
                <th style={{ width: 200 }}>Producto</th>
                <th style={{ width: 110 }}>Rating</th>
                <th>Comentario</th>
                <th style={{ width: 150 }}>Cliente</th>
                <th style={{ width: 110 }}>Estado</th>
                <th style={{ width: 130, textAlign: 'right' }}>Acciones</th>
              </tr></thead>
              <tbody>
                {resenas.map((r, i) => {
                  const badge = ESTADO_BADGE[r.estado]
                  return (
                    <tr key={r.id}>
                      <td className="num muted tnum">{(meta?.from ?? 1) + i}</td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 12.5 }}>{r.producto?.nombre ?? '—'}</div>
                        <div className="muted" style={{ fontSize: 11 }}>{fmtFecha(r.created_at)}</div>
                      </td>
                      <td><Estrellas rating={r.rating} /></td>
                      <td style={{ maxWidth: 380 }}>
                        <div style={{ fontSize: 12.5, whiteSpace: 'pre-wrap' }}>{r.comentario || <span className="muted">Sin comentario</span>}</div>
                      </td>
                      <td className="muted" style={{ fontSize: 12 }}>{nombreCuenta(r.cuenta)}</td>
                      <td><span className="badge" data-tone={badge.tone}><span className="b-dot" />{badge.label}</span></td>
                      <td>
                        <div className="row-actions">
                          {r.estado !== 'publicado' && (
                            <button className="icon-action" data-variant="activate" title="Publicar" disabled={cambiar.isPending}
                              onClick={() => cambiar.mutate({ id: r.id, estado: 'publicado' })}><Check /></button>
                          )}
                          {r.estado !== 'rechazado' && (
                            <button className="icon-action" data-variant="delete" title="Rechazar" disabled={cambiar.isPending}
                              onClick={() => cambiar.mutate({ id: r.id, estado: 'rechazado' })}><X /></button>
                          )}
                          {r.estado !== 'pendiente' && (
                            <button className="icon-action" data-variant="toggle" title="Volver a pendiente" disabled={cambiar.isPending}
                              onClick={() => cambiar.mutate({ id: r.id, estado: 'pendiente' })}><RotateCcw /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {meta && <Pagination meta={meta} page={page} setPage={setPage} />}
          </>
        )}
      </div>
    </>
  )
}
