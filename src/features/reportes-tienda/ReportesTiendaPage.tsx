import { useState, useEffect } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { Loader2, Settings, X, List, LayoutGrid, User } from 'lucide-react'
import { I } from '@/components/icons'
import { KpiGrid } from '@/components/ui/KpiGrid'
import { Select } from '@/components/ui/Select'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pagination } from '@/components/ui/Pagination'
import { GestionarReporte } from './GestionarReporte'
import { reportesTiendaApi } from '@/lib/api'
import { useAutoPageSize, vistaInicial } from '@/lib/hooks'
import { fmtFecha } from '@/lib/format'
import { REPORTE_CATEGORIAS, type ReporteCategoria, type ReporteEstado, type ReporteFiltros, type ReporteProblema } from '@/types/reporte-problema'

const PER_PAGE = 20

type Vista = 'tabla' | 'cards'

const ESTADO_BADGE: Record<ReporteEstado, { label: string; tone?: 'pos' | 'neg' | 'warn' }> = {
  pendiente: { label: 'Pendiente', tone: 'warn' },
  en_revision: { label: 'En revisión' },
  resuelto: { label: 'Resuelto', tone: 'pos' },
  invalido: { label: 'Inválido', tone: 'neg' },
}

function contacto(r: ReporteProblema): string {
  if (r.cuenta) return [r.cuenta.nombre, r.cuenta.apellido].filter(Boolean).join(' ') || r.cuenta.email
  return r.nombre_contacto || r.email_contacto || 'Invitado'
}

function categoriaLabel(r: ReporteProblema): string {
  return r.categoria_label ?? REPORTE_CATEGORIAS[r.categoria as ReporteCategoria] ?? r.categoria
}

export default function ReportesTiendaPage() {
  const [estado, setEstado] = useState('todos')

  // Pulsar el KPI activo lo desmarca y vuelve a "todos".
  const filtrarPor = (valor: string) => {
    setEstado((actual) => (actual === valor ? 'todos' : valor))
    setPage(1)
  }
  const [categoria, setCategoria] = useState('todos')
  const [vista, setVista] = useState<Vista>(() => vistaInicial('problemas_vista'))
  const [page, setPage] = useState(1)
  const [gestionar, setGestionar] = useState<ReporteProblema | null>(null)

  useEffect(() => { localStorage.setItem('problemas_vista', vista) }, [vista])

  const { ref: cardsRef, perPage: autoPerPage } = useAutoPageSize({ rows: 3 })
  const perPage = vista === 'cards' ? autoPerPage : PER_PAGE
  useEffect(() => { setPage(1) }, [perPage])

  const filtros: ReporteFiltros = {
    estado: estado !== 'todos' ? estado : undefined,
    categoria: categoria !== 'todos' ? categoria : undefined,
    page, per_page: perPage,
  }

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['reportes-tienda', filtros],
    queryFn: () => reportesTiendaApi.listar(filtros),
    placeholderData: keepPreviousData,
  })

  const reportes = data?.reportes.data ?? []
  const counts = data?.counts
  const meta = data?.reportes

  const opcionesCategoria = [
    { value: 'todos', label: 'Todas las categorías' },
    ...Object.entries(REPORTE_CATEGORIAS).map(([value, label]) => ({ value, label })),
  ]

  return (
    <>
      <PageHeader title="Reportes de tienda" subtitle="Problemas reportados por clientes de la tienda" />

      {counts && (
        <KpiGrid items={[
          { label: 'Total', value: counts.total, icon: I.Flag, tone: 'accent', sub: 'reportes',
            onClick: () => filtrarPor('todos'), activo: estado === 'todos' },
          { label: 'Pendientes', value: counts.pendiente, icon: I.Clock, tone: 'warn', sub: 'sin revisar',
            onClick: () => filtrarPor('pendiente'), activo: estado === 'pendiente' },
          { label: 'En revisión', value: counts.en_revision, icon: I.Search, tone: 'info', sub: 'en proceso',
            onClick: () => filtrarPor('en_revision'), activo: estado === 'en_revision' },
          { label: 'Resueltos', value: counts.resuelto, icon: I.CheckCircle, tone: 'pos', sub: 'cerrados',
            onClick: () => filtrarPor('resuelto'), activo: estado === 'resuelto' },
          { label: 'Inválidos', value: counts.invalido, icon: I.Ban, tone: 'neg', sub: 'descartados',
            onClick: () => filtrarPor('invalido'), activo: estado === 'invalido' },
        ]} />
      )}

      <div className="toolbar">
        <Select value={estado} onValueChange={(v) => { setEstado(v); setPage(1) }} ariaLabel="Estado"
          options={[
            { value: 'todos', label: 'Todos los estados' },
            { value: 'pendiente', label: 'Pendientes' },
            { value: 'en_revision', label: 'En revisión' },
            { value: 'resuelto', label: 'Resueltos' },
            { value: 'invalido', label: 'Inválidos' },
          ]} />
        <Select value={categoria} onValueChange={(v) => { setCategoria(v); setPage(1) }} ariaLabel="Categoría" options={opcionesCategoria} />
        {[estado !== 'todos', categoria !== 'todos'].filter(Boolean).length >= 2 && (
          <button className="btn" onClick={() => { setEstado('todos'); setCategoria('todos'); setPage(1) }} title="Limpiar filtros"><X size={15} /> Limpiar</button>
        )}
        {isFetching && <Loader2 size={14} className="spin" style={{ color: 'var(--text-faint)' }} />}
        <div className="view-toggle" style={{ marginLeft: 'auto' }}>
          <button data-on={vista === 'tabla'} onClick={() => setVista('tabla')} title="Vista de tabla"><List /></button>
          <button data-on={vista === 'cards'} onClick={() => setVista('cards')} title="Vista de tarjetas"><LayoutGrid /></button>
        </div>
      </div>

      {isLoading ? (
        <div className="card"><div className="empty" style={{ padding: 80 }}><Loader2 size={26} className="spin" style={{ color: 'var(--accent)' }} /><div>Cargando…</div></div></div>
      ) : isError ? (
        <div className="card"><div className="empty" style={{ padding: 80 }}><I.AlertCircle /><div>No se pudieron cargar los reportes</div>
          <button className="btn" style={{ marginTop: 10 }} onClick={() => refetch()}><I.Refresh /> Reintentar</button></div></div>
      ) : reportes.length === 0 ? (
        <div className="card"><div className="empty" style={{ padding: 80 }}><I.Flag /><div>No hay reportes con esos filtros</div></div></div>
      ) : vista === 'cards' ? (
        <>
          <div className="ccards" ref={cardsRef}>
            {reportes.map((r) => <ReporteCard key={r.id} reporte={r} onGestionar={() => setGestionar(r)} />)}
          </div>
          {meta && meta.last_page > 1 && <div className="card"><Pagination meta={meta} page={page} setPage={setPage} /></div>}
        </>
      ) : (
        <div className="card">
          <table className="tbl">
            <thead><tr>
              <th className="num" style={{ width: 48 }}>No.</th>
              <th style={{ width: 160 }}>Categoría</th>
              <th>Descripción</th>
              <th style={{ width: 150 }}>Contacto</th>
              <th style={{ width: 110 }}>Fecha</th>
              <th style={{ width: 110 }}>Estado</th>
              <th style={{ width: 80, textAlign: 'right' }}>Gestión</th>
            </tr></thead>
            <tbody>
              {reportes.map((r, i) => {
                const badge = ESTADO_BADGE[r.estado]
                return (
                  <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => setGestionar(r)}>
                    <td className="num muted tnum">{(meta?.from ?? 1) + i}</td>
                    <td>
                      <span className="badge"><span className="b-dot" />{categoriaLabel(r)}</span>
                    </td>
                    <td style={{ maxWidth: 380 }}>
                      <div style={{ fontSize: 12.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{r.descripcion}</div>
                    </td>
                    <td className="muted" style={{ fontSize: 12 }}>{contacto(r)}</td>
                    <td className="muted" style={{ fontSize: 12 }}>{fmtFecha(r.created_at)}</td>
                    <td><span className="badge" data-tone={badge.tone}><span className="b-dot" />{badge.label}</span></td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="row-actions">
                        <button className="icon-action" data-variant="edit" title="Gestionar" onClick={() => setGestionar(r)}><Settings /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {meta && <Pagination meta={meta} page={page} setPage={setPage} />}
        </div>
      )}

      <GestionarReporte open={!!gestionar} onClose={() => setGestionar(null)} reporteId={gestionar?.id ?? null} />
    </>
  )
}

// ── Tarjeta de reporte / problema ─────────────────────────────────────────────

function ReporteCard({ reporte: r, onGestionar }: { reporte: ReporteProblema; onGestionar: () => void }) {
  const badge = ESTADO_BADGE[r.estado]
  return (
    <div className="ccard" onClick={onGestionar}>
      <div className="rc-head">
        <div style={{ minWidth: 0 }}>
          <div className="rc-title">{categoriaLabel(r)}</div>
          <div className="rc-sub">{fmtFecha(r.created_at)}</div>
        </div>
        <span className="badge" data-tone={badge.tone}><span className="b-dot" />{badge.label}</span>
      </div>

      <div className="rc-body">
        <div className="rc-text">{r.descripcion}</div>
      </div>

      <div className="rc-foot" onClick={(e) => e.stopPropagation()}>
        <span className="rc-who"><User /><span>{contacto(r)}</span></span>
        <div className="row-actions">
          <button className="icon-action" data-variant="edit" title="Gestionar" onClick={onGestionar}><Settings /></button>
        </div>
      </div>
    </div>
  )
}
