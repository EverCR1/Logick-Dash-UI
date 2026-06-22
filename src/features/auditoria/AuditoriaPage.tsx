import { useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { Loader2, Eye } from 'lucide-react'
import { I } from '@/components/icons'
import { Select } from '@/components/ui/Select'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pagination } from '@/components/ui/Pagination'
import { DetalleAuditoria } from './DetalleAuditoria'
import { auditoriaApi } from '@/lib/api'
import { useDebounce } from '@/lib/hooks'
import { fmtFecha } from '@/lib/format'
import type { Auditoria, AuditoriaFiltros } from '@/types/auditoria'

const PER_PAGE = 50

export const ACCION_BADGE: Record<string, { label: string; tone?: 'pos' | 'neg' | 'warn' }> = {
  CREAR: { label: 'Creación', tone: 'pos' },
  EDITAR: { label: 'Edición', tone: 'warn' },
  ELIMINAR: { label: 'Eliminación', tone: 'neg' },
  CAMBIO_ESTADO: { label: 'Cambio de estado' },
}

export default function AuditoriaPage() {
  const [busqueda, setBusqueda] = useState('')
  const busquedaDebounced = useDebounce(busqueda)
  const [modulo, setModulo] = useState('todos')
  const [accion, setAccion] = useState('todos')
  const [page, setPage] = useState(1)
  const [detalle, setDetalle] = useState<Auditoria | null>(null)

  const { data: modulos = [] } = useQuery({ queryKey: ['auditoria-modulos'], queryFn: auditoriaApi.modulos, staleTime: 1000 * 60 * 10 })

  const filtros: AuditoriaFiltros = {
    busqueda: busquedaDebounced || undefined,
    modulo: modulo !== 'todos' ? modulo : undefined,
    accion: accion !== 'todos' ? accion : undefined,
    page, per_page: PER_PAGE,
  }

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['auditoria', filtros],
    queryFn: () => auditoriaApi.listar(filtros),
    placeholderData: keepPreviousData,
  })

  const logs = data?.auditoria.data ?? []
  const meta = data?.auditoria

  return (
    <>
      <PageHeader title="Auditoría" subtitle="Registro de acciones realizadas en el sistema" />

      <div className="toolbar">
        <div className="toolbar-search">
          <I.Search />
          <input placeholder="Buscar por usuario, descripción…" value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setPage(1) }} />
          {isFetching && <Loader2 size={14} className="spin" style={{ color: 'var(--text-faint)' }} />}
        </div>
        <Select value={modulo} onValueChange={(v) => { setModulo(v); setPage(1) }} ariaLabel="Módulo"
          options={[{ value: 'todos', label: 'Todos los módulos' }, ...modulos.map((m) => ({ value: m, label: m }))]} />
        <Select value={accion} onValueChange={(v) => { setAccion(v); setPage(1) }} ariaLabel="Acción"
          options={[
            { value: 'todos', label: 'Todas las acciones' },
            { value: 'CREAR', label: 'Creación' },
            { value: 'EDITAR', label: 'Edición' },
            { value: 'ELIMINAR', label: 'Eliminación' },
            { value: 'CAMBIO_ESTADO', label: 'Cambio de estado' },
          ]} />
      </div>

      <div className="card">
        {isLoading ? (
          <div className="empty" style={{ padding: 80 }}><Loader2 size={26} className="spin" style={{ color: 'var(--accent)' }} /><div>Cargando…</div></div>
        ) : isError ? (
          <div className="empty" style={{ padding: 80 }}><I.AlertCircle /><div>No se pudo cargar la auditoría</div>
            <button className="btn" style={{ marginTop: 10 }} onClick={() => refetch()}><I.Refresh /> Reintentar</button></div>
        ) : logs.length === 0 ? (
          <div className="empty" style={{ padding: 80 }}><I.Shield /><div>No hay registros con esos filtros</div></div>
        ) : (
          <>
            <table className="tbl">
              <thead><tr>
                <th className="num" style={{ width: 48 }}>No.</th>
                <th style={{ width: 150 }}>Fecha</th>
                <th style={{ width: 130 }}>Acción</th>
                <th style={{ width: 130 }}>Módulo</th>
                <th>Descripción</th>
                <th style={{ width: 160 }}>Usuario</th>
                <th style={{ width: 70, textAlign: 'right' }}>Ver</th>
              </tr></thead>
              <tbody>
                {logs.map((l, i) => {
                  const badge = ACCION_BADGE[l.accion] ?? { label: l.accion }
                  return (
                    <tr key={l.id} style={{ cursor: 'pointer' }} onClick={() => setDetalle(l)}>
                      <td className="num muted tnum">{(meta?.from ?? 1) + i}</td>
                      <td className="muted" style={{ fontSize: 12 }}>{fmtFecha(l.created_at, true)}</td>
                      <td><span className="badge" data-tone={badge.tone}><span className="b-dot" />{badge.label}</span></td>
                      <td style={{ fontSize: 12.5, textTransform: 'capitalize' }}>{l.modulo}</td>
                      <td style={{ maxWidth: 360 }}>
                        <div style={{ fontSize: 12.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{l.descripcion || '—'}</div>
                      </td>
                      <td>
                        <div style={{ fontSize: 12.5 }}>{l.usuario_nombre || '—'}</div>
                        {l.usuario_rol && <div className="muted" style={{ fontSize: 11, textTransform: 'capitalize' }}>{l.usuario_rol}</div>}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="row-actions">
                          <button className="icon-action" data-variant="view" title="Ver detalle" onClick={() => setDetalle(l)}><Eye /></button>
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

      <DetalleAuditoria open={!!detalle} onClose={() => setDetalle(null)} log={detalle} />
    </>
  )
}
