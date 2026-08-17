import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, MessageSquare, Ban, List, LayoutGrid, User } from 'lucide-react'
import { I } from '@/components/icons'
import { KpiGrid } from '@/components/ui/KpiGrid'
import { Select } from '@/components/ui/Select'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pagination } from '@/components/ui/Pagination'
import { ResponderPregunta } from './ResponderPregunta'
import { preguntasApi } from '@/lib/api'
import { useAutoPageSize, vistaInicial } from '@/lib/hooks'
import { fmtFecha } from '@/lib/format'
import type { Pregunta, PreguntaEstado, PreguntaFiltros } from '@/types/pregunta'

const PER_PAGE = 20

type Vista = 'tabla' | 'cards'

const ESTADO_BADGE: Record<PreguntaEstado, { label: string; tone?: 'pos' | 'neg' | 'warn' }> = {
  pendiente: { label: 'Pendiente', tone: 'warn' },
  respondida: { label: 'Respondida', tone: 'pos' },
  rechazada: { label: 'Rechazada', tone: 'neg' },
}

function nombreCuenta(c: Pregunta['cuenta']): string {
  if (!c) return 'Anónimo'
  return [c.nombre, c.apellido].filter(Boolean).join(' ') || 'Anónimo'
}

export default function PreguntasPage() {
  const queryClient = useQueryClient()
  const [estado, setEstado] = useState('todos')

  // Pulsar el KPI activo lo desmarca y vuelve a "todos".
  const filtrarPor = (valor: string) => {
    setEstado((actual) => (actual === valor ? 'todos' : valor))
    setPage(1)
  }
  const [vista, setVista] = useState<Vista>(() => vistaInicial('preguntas_vista'))
  const [page, setPage] = useState(1)
  const [responder, setResponder] = useState<Pregunta | null>(null)
  const [aRechazar, setARechazar] = useState<Pregunta | null>(null)

  useEffect(() => { localStorage.setItem('preguntas_vista', vista) }, [vista])

  const { ref: cardsRef, perPage: autoPerPage } = useAutoPageSize({ rows: 3 })
  const perPage = vista === 'cards' ? autoPerPage : PER_PAGE
  useEffect(() => { setPage(1) }, [perPage])

  const filtros: PreguntaFiltros = { estado: estado !== 'todos' ? estado : undefined, page, per_page: perPage }

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['preguntas', filtros],
    queryFn: () => preguntasApi.listar(filtros),
    placeholderData: keepPreviousData,
  })

  const rechazar = useMutation({
    mutationFn: (id: number) => preguntasApi.actualizar(id, { estado: 'rechazada' }),
    onSuccess: () => { toast.success('Pregunta rechazada'); setARechazar(null); queryClient.invalidateQueries({ queryKey: ['preguntas'] }) },
    onError: () => toast.error('No se pudo rechazar la pregunta'),
  })

  const preguntas = data?.preguntas.data ?? []
  const counts = data?.counts
  const meta = data?.preguntas

  return (
    <>
      <PageHeader title="Preguntas" subtitle="Preguntas de clientes sobre productos" />

      {counts && (
        <KpiGrid items={[
          { label: 'Total', value: counts.total, icon: I.Help, tone: 'accent', sub: 'preguntas',
            onClick: () => filtrarPor('todos'), activo: estado === 'todos' },
          { label: 'Pendientes', value: counts.pendiente, icon: I.Clock, tone: 'warn', sub: 'por responder',
            onClick: () => filtrarPor('pendiente'), activo: estado === 'pendiente' },
          { label: 'Respondidas', value: counts.respondida, icon: I.CheckCircle, tone: 'pos', sub: 'contestadas',
            onClick: () => filtrarPor('respondida'), activo: estado === 'respondida' },
          { label: 'Rechazadas', value: counts.rechazada, icon: I.Ban, tone: 'neg', sub: 'descartadas',
            onClick: () => filtrarPor('rechazada'), activo: estado === 'rechazada' },
        ]} />
      )}

      <div className="toolbar">
        <Select value={estado} onValueChange={(v) => { setEstado(v); setPage(1) }} ariaLabel="Estado"
          options={[
            { value: 'todos', label: 'Todos los estados' },
            { value: 'pendiente', label: 'Pendientes' },
            { value: 'respondida', label: 'Respondidas' },
            { value: 'rechazada', label: 'Rechazadas' },
          ]} />
        {isFetching && <Loader2 size={14} className="spin" style={{ color: 'var(--text-faint)' }} />}
        <div className="view-toggle" style={{ marginLeft: 'auto' }}>
          <button data-on={vista === 'tabla'} onClick={() => setVista('tabla')} title="Vista de tabla"><List /></button>
          <button data-on={vista === 'cards'} onClick={() => setVista('cards')} title="Vista de tarjetas"><LayoutGrid /></button>
        </div>
      </div>

      {isLoading ? (
        <div className="card"><div className="empty" style={{ padding: 80 }}><Loader2 size={26} className="spin" style={{ color: 'var(--accent)' }} /><div>Cargando…</div></div></div>
      ) : isError ? (
        <div className="card"><div className="empty" style={{ padding: 80 }}><I.AlertCircle /><div>No se pudieron cargar las preguntas</div>
          <button className="btn" style={{ marginTop: 10 }} onClick={() => refetch()}><I.Refresh /> Reintentar</button></div></div>
      ) : preguntas.length === 0 ? (
        <div className="card"><div className="empty" style={{ padding: 80 }}><I.Help /><div>No hay preguntas con esos filtros</div></div></div>
      ) : vista === 'cards' ? (
        <>
          <div className="ccards" ref={cardsRef}>
            {preguntas.map((p) => (
              <PreguntaCard key={p.id} pregunta={p} onResponder={() => setResponder(p)} onRechazar={() => setARechazar(p)} />
            ))}
          </div>
          {meta && meta.last_page > 1 && <div className="card"><Pagination meta={meta} page={page} setPage={setPage} /></div>}
        </>
      ) : (
        <div className="card">
          <table className="tbl">
            <thead><tr>
              <th className="num" style={{ width: 48 }}>No.</th>
              <th style={{ width: 180 }}>Producto</th>
              <th>Pregunta / Respuesta</th>
              <th style={{ width: 140 }}>Cliente</th>
              <th style={{ width: 110 }}>Estado</th>
              <th style={{ width: 120, textAlign: 'right' }}>Acciones</th>
            </tr></thead>
            <tbody>
              {preguntas.map((p, i) => {
                const badge = ESTADO_BADGE[p.estado]
                return (
                  <tr key={p.id}>
                    <td className="num muted tnum">{(meta?.from ?? 1) + i}</td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 12.5 }}>{p.producto?.nombre ?? '—'}</div>
                      <div className="muted" style={{ fontSize: 11 }}>{fmtFecha(p.created_at)}</div>
                    </td>
                    <td style={{ maxWidth: 420 }}>
                      <div style={{ fontSize: 12.5, whiteSpace: 'pre-wrap' }}>{p.pregunta}</div>
                      {p.respuesta && (
                        <div style={{ fontSize: 12, marginTop: 6, paddingLeft: 10, borderLeft: '2px solid var(--accent)', color: 'var(--text-soft)' }}>
                          <strong style={{ color: 'var(--accent)' }}>Respuesta:</strong> {p.respuesta}
                        </div>
                      )}
                    </td>
                    <td className="muted" style={{ fontSize: 12 }}>{nombreCuenta(p.cuenta)}</td>
                    <td><span className="badge" data-tone={badge.tone}><span className="b-dot" />{badge.label}</span></td>
                    <td>
                      <PreguntaAcciones estado={p.estado} onResponder={() => setResponder(p)} onRechazar={() => setARechazar(p)} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {meta && <Pagination meta={meta} page={page} setPage={setPage} />}
        </div>
      )}

      <ResponderPregunta open={!!responder} onClose={() => setResponder(null)} pregunta={responder} />

      <ConfirmDialog open={!!aRechazar} onOpenChange={(o) => !o && setARechazar(null)}
        title="Rechazar pregunta" description={aRechazar ? `¿Rechazar esta pregunta? No se mostrará en la tienda.` : ''}
        confirmLabel="Rechazar" danger loading={rechazar.isPending}
        onConfirm={() => aRechazar && rechazar.mutate(aRechazar.id)} />
    </>
  )
}

// ── Acciones compartidas (tabla y card) ───────────────────────────────────────

function PreguntaAcciones({ estado, onResponder, onRechazar }: { estado: PreguntaEstado; onResponder: () => void; onRechazar: () => void }) {
  return (
    <div className="row-actions">
      <button className="icon-action" data-variant="view" title="Responder" onClick={onResponder}><MessageSquare /></button>
      {estado !== 'rechazada' && (
        <button className="icon-action" data-variant="delete" title="Rechazar" onClick={onRechazar}><Ban /></button>
      )}
    </div>
  )
}

// ── Tarjeta de pregunta ───────────────────────────────────────────────────────

function PreguntaCard({ pregunta: p, onResponder, onRechazar }: { pregunta: Pregunta; onResponder: () => void; onRechazar: () => void }) {
  const badge = ESTADO_BADGE[p.estado]
  return (
    <div className="ccard static">
      <div className="rc-head">
        <div style={{ minWidth: 0 }}>
          <div className="rc-title">{p.producto?.nombre ?? '—'}</div>
          <div className="rc-sub">{fmtFecha(p.created_at)}</div>
        </div>
        <span className="badge" data-tone={badge.tone}><span className="b-dot" />{badge.label}</span>
      </div>

      <div className="rc-body">
        <div className="rc-text">{p.pregunta}</div>
        {p.respuesta && <div className="rc-answer"><strong>Respuesta:</strong> {p.respuesta}</div>}
      </div>

      <div className="rc-foot">
        <span className="rc-who"><User /><span>{nombreCuenta(p.cuenta)}</span></span>
        <PreguntaAcciones estado={p.estado} onResponder={onResponder} onRechazar={onRechazar} />
      </div>
    </div>
  )
}
