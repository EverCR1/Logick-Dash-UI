import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, Pencil, Trash2, X, FileText, Send, Check, Ban, ShoppingCart, Eye } from 'lucide-react'
import { I } from '@/components/icons'
import { Select } from '@/components/ui/Select'
import { KpiGrid } from '@/components/ui/KpiGrid'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pagination } from '@/components/ui/Pagination'
import { BuscadorToolbar } from '@/components/ui/BuscadorToolbar'
import { ESTADO_OPCIONES, estadoVisible, diasRestantes } from './cotizacion-estados'
import { DetalleCotizacion } from './DetalleCotizacion'
import { cotizacionesApi } from '@/lib/api'
import { useDebounce } from '@/lib/hooks'
import { q, fmtN, fmtFecha } from '@/lib/format'
import type { Cotizacion, CotizacionFiltros } from '@/types/cotizacion'

const PER_PAGE = 15

export default function CotizacionesPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const searchDebounced = useDebounce(search)
  const [estado, setEstado] = useState('todos')
  const [sort, setSort] = useState('fecha_desc')
  const [page, setPage] = useState(1)
  const [aEliminar, setAEliminar] = useState<Cotizacion | null>(null)
  const [verId, setVerId] = useState<number | null>(null)

  const filtros: CotizacionFiltros = {
    search: searchDebounced || undefined,
    estado: estado !== 'todos' ? estado : undefined,
    sort, page, per_page: PER_PAGE,
  }

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['cotizaciones', filtros],
    queryFn: () => cotizacionesApi.listar(filtros),
    placeholderData: keepPreviousData,
  })

  const cotizaciones = data?.cotizaciones.data ?? []
  const meta = data?.cotizaciones
  const conteos = data?.conteos

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ['cotizaciones'] })

  const cambiarEstado = useMutation({
    mutationFn: ({ id, estado }: { id: number; estado: 'enviada' | 'aceptada' | 'rechazada' }) =>
      cotizacionesApi.cambiarEstado(id, estado),
    onSuccess: (c) => { toast.success(`${c.numero_cotizacion} marcada como ${estadoVisible(c).label.toLowerCase()}`); invalidar() },
    onError: () => toast.error('No se pudo cambiar el estado'),
  })

  const eliminar = useMutation({
    mutationFn: (id: number) => cotizacionesApi.eliminar(id),
    onSuccess: () => { toast.success('Cotización eliminada'); setAEliminar(null); invalidar() },
    onError: () => toast.error('No se pudo eliminar la cotización'),
  })

  const filtrarPor = (valor: string) => { setEstado(estado === valor ? 'todos' : valor); setPage(1) }

  const filtrosActivos = [!!search, estado !== 'todos', sort !== 'fecha_desc'].filter(Boolean).length
  const limpiarFiltros = () => { setSearch(''); setEstado('todos'); setSort('fecha_desc'); setPage(1) }

  return (
    <>
      <PageHeader title="Cotizaciones" subtitle="Presupuestos para el cliente, sin registrar la venta"
        action={<button className="btn btn-primary" onClick={() => navigate('/cotizaciones/nueva')}><I.Plus /> Nueva cotización</button>} />

      {conteos && (
        <KpiGrid items={[
          { label: 'Vigentes', value: fmtN(conteos.vigentes), icon: I.Clock, tone: 'pos', sub: 'dentro de plazo', onClick: () => filtrarPor('vigente'), activo: estado === 'vigente' },
          { label: 'Vencidas', value: fmtN(conteos.vencidas), icon: I.AlertCircle, tone: 'warn', sub: 'fuera de plazo', onClick: () => filtrarPor('vencida'), activo: estado === 'vencida' },
          { label: 'Enviadas', value: fmtN(conteos.enviada), icon: I.Cal, tone: 'info', sub: 'esperando respuesta', onClick: () => filtrarPor('enviada'), activo: estado === 'enviada' },
          { label: 'Aceptadas', value: fmtN(conteos.aceptada), icon: I.CheckCircle, tone: 'pos', sub: 'por convertir', onClick: () => filtrarPor('aceptada'), activo: estado === 'aceptada' },
          { label: 'Convertidas', value: fmtN(conteos.convertida), icon: I.Cart, tone: 'violet', sub: 'ya son venta', onClick: () => filtrarPor('convertida'), activo: estado === 'convertida' },
          { label: 'Total', value: fmtN(conteos.total), icon: I.Layers, sub: 'cotizaciones' },
        ]} />
      )}

      <div className="toolbar">
        <BuscadorToolbar placeholder="Buscar por N° cotización, cliente o producto…" value={search} onChange={(v) => { setSearch(v); setPage(1) }} cargando={isFetching} />
        <Select value={estado} onValueChange={(v) => { setEstado(v); setPage(1) }} ariaLabel="Estado" options={ESTADO_OPCIONES} />
        <Select value={sort} onValueChange={(v) => { setSort(v); setPage(1) }} ariaLabel="Orden"
          options={[
            { value: 'fecha_desc', label: 'Más recientes' },
            { value: 'fecha_asc', label: 'Más antiguas' },
            { value: 'vigencia_asc', label: 'Vencen antes' },
            { value: 'total_desc', label: 'Mayor total' },
            { value: 'total_asc', label: 'Menor total' },
          ]} />
        {filtrosActivos >= 2 && <button className="btn" onClick={limpiarFiltros} title="Limpiar filtros"><X size={15} /> Limpiar</button>}
      </div>

      {isLoading ? (
        <div className="card"><div className="empty" style={{ padding: 80 }}><Loader2 size={26} className="spin" style={{ color: 'var(--accent)' }} /><div>Cargando…</div></div></div>
      ) : isError ? (
        <div className="card"><div className="empty" style={{ padding: 80 }}><I.AlertCircle /><div>No se pudieron cargar las cotizaciones</div>
          <button className="btn" style={{ marginTop: 10 }} onClick={() => refetch()}><I.Refresh /> Reintentar</button></div></div>
      ) : cotizaciones.length === 0 ? (
        <div className="card"><div className="empty" style={{ padding: 80 }}><FileText size={26} /><div>No se encontraron cotizaciones</div>
          <div className="muted" style={{ fontSize: 12 }}>Crea una para enviarle precios a un cliente sin registrar la venta.</div></div></div>
      ) : (
        <div className="card">
            <table className="tbl">
              <thead>
                <tr>
                  <th>N° / Cliente</th>
                  <th>Estado</th>
                  <th>Vigencia</th>
                  {/* col-secundaria: se ocultan en pantallas estrechas, donde el
                      número, el estado, la vigencia y el total son lo que importa */}
                  <th className="num col-secundaria">Líneas</th>
                  <th className="num">Total</th>
                  <th className="col-secundaria">Creada</th>
                  <th style={{ width: 150 }} />
                </tr>
              </thead>
              <tbody>
                {cotizaciones.map((c) => {
                  const badge = estadoVisible(c)
                  const dias = diasRestantes(c.valido_hasta)
                  const cerrada = c.estado === 'convertida'
                  return (
                    <tr key={c.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{c.numero_cotizacion}</div>
                        <div className="muted" style={{ fontSize: 11.5 }}>
                          {c.cliente?.nombre ?? c.nombre_cliente ?? 'Sin cliente'}
                        </div>
                      </td>
                      <td>
                        <span className="badge" data-tone={badge.tone}><span className="b-dot" />{badge.label}</span>
                        {c.venta && <div className="muted" style={{ fontSize: 11, marginTop: 3 }}>{c.venta.numero_venta}</div>}
                      </td>
                      <td>
                        <div style={{ fontSize: 12.5 }}>{fmtFecha(c.valido_hasta)}</div>
                        <div className="muted" style={{ fontSize: 11 }}>
                          {cerrada ? '—' : dias > 0 ? `faltan ${dias} d` : dias === 0 ? 'vence hoy' : `hace ${-dias} d`}
                        </div>
                      </td>
                      <td className="num tnum col-secundaria">{c.detalles?.length ?? 0}</td>
                      <td className="num tnum" style={{ fontWeight: 600 }}>{q(c.total)}</td>
                      <td className="col-secundaria" style={{ fontSize: 12.5 }}>{fmtFecha(c.created_at)}</td>
                      <td>
                        <div className="row-actions">
                          <button className="icon-action" title="Ver detalle"
                            onClick={() => setVerId(c.id)}><Eye /></button>
                          {!cerrada && c.estado === 'borrador' && (
                            <button className="icon-action" title="Marcar como enviada"
                              onClick={() => cambiarEstado.mutate({ id: c.id, estado: 'enviada' })}><Send /></button>
                          )}
                          {!cerrada && c.estado === 'enviada' && (
                            <>
                              <button className="icon-action" title="Marcar como aceptada"
                                onClick={() => cambiarEstado.mutate({ id: c.id, estado: 'aceptada' })}><Check /></button>
                              <button className="icon-action" title="Marcar como rechazada"
                                onClick={() => cambiarEstado.mutate({ id: c.id, estado: 'rechazada' })}><Ban /></button>
                            </>
                          )}
                          {!cerrada && (
                            <button className="icon-action" title="Convertir en venta"
                              onClick={() => navigate(`/ventas/nueva?cotizacion=${c.id}`)}><ShoppingCart /></button>
                          )}
                          {!cerrada && (
                            <button className="icon-action" title="Editar"
                              onClick={() => navigate(`/cotizaciones/${c.id}/editar`)}><Pencil /></button>
                          )}
                          {!cerrada && (
                            <button className="icon-action" data-variant="delete" title="Eliminar"
                              onClick={() => setAEliminar(c)}><Trash2 /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          {meta && meta.last_page > 1 && <Pagination meta={meta} page={page} setPage={setPage} />}
        </div>
      )}

      <DetalleCotizacion open={verId !== null} cotizacionId={verId} onClose={() => setVerId(null)} />

      <ConfirmDialog
        open={!!aEliminar}
        title="Eliminar cotización"
        message={aEliminar ? `Se eliminará ${aEliminar.numero_cotizacion} y todas sus líneas. Esta acción no se puede deshacer.` : ''}
        confirmText="Eliminar"
        variant="danger"
        loading={eliminar.isPending}
        onConfirm={() => aEliminar && eliminar.mutate(aEliminar.id)}
        onClose={() => setAEliminar(null)}
      />
    </>
  )
}
