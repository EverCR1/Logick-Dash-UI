import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { Loader2, Pencil, HandCoins, Ban, Wallet, X, Eye, Receipt, List, LayoutGrid } from 'lucide-react'
import { I } from '@/components/icons'
import { Select } from '@/components/ui/Select'
import { PageHeader } from '@/components/ui/PageHeader'
import { KpiGrid } from '@/components/ui/KpiGrid'
import { Pagination } from '@/components/ui/Pagination'
import { BuscadorToolbar } from '@/components/ui/BuscadorToolbar'
import { CreditoForm } from './CreditoForm'
import { RegistrarPago } from './RegistrarPago'
import { CerrarCredito, type ModoCierre } from './CerrarCredito'
import { creditosApi } from '@/lib/api'
import { useDebounce, useAutoPageSize, vistaInicial } from '@/lib/hooks'
import { q, fmtN, fmtFecha } from '@/lib/format'
import type { Credito, CreditoEstado, CreditoFiltros } from '@/types/credito'

const PER_PAGE = 15

type Vista = 'tabla' | 'cards'

const ESTADO_BADGE: Record<CreditoEstado, { label: string; tone?: 'pos' | 'neg' | 'warn' }> = {
  activo: { label: 'Activo', tone: 'warn' },
  abonado: { label: 'Abonado' },
  pagado: { label: 'Pagado', tone: 'pos' },
  // Condonado en negativo: es dinero que se dejó de cobrar. Anulado es neutro,
  // porque no hubo pérdida — el crédito nunca debió existir.
  condonado: { label: 'Condonado', tone: 'neg' },
  anulado: { label: 'Anulado' },
}

/** Mismo criterio que `Credito::ESTADOS_ABIERTOS` en la API. */
const estaAbierto = (c: Credito) => c.estado === 'activo' || c.estado === 'abonado'

function progresoPct(c: Credito): number {
  const cap = Number(c.capital) || 0
  if (cap <= 0) return 0
  return Math.round(((cap - Number(c.capital_restante)) / cap) * 100)
}

function ProgresoBar({ pct }: { pct: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: 'var(--bg-elev-2)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: pct >= 100 ? '#22c55e' : 'var(--accent)' }} />
      </div>
      <span className="muted tnum" style={{ fontSize: 11, minWidth: 32, textAlign: 'right' }}>{pct}%</span>
    </div>
  )
}

export default function CreditosPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const searchDebounced = useDebounce(search)
  const [estado, setEstado] = useState('todos')
  const [sort, setSort] = useState<CreditoFiltros['sort']>('fecha_desc')
  const [vista, setVista] = useState<Vista>(() => vistaInicial('creditos_vista'))
  const [page, setPage] = useState(1)
  const [aCerrar, setACerrar] = useState<{ credito: Credito; modo: ModoCierre } | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editar, setEditar] = useState<Credito | null>(null)
  const [pagar, setPagar] = useState<Credito | null>(null)

  useEffect(() => { localStorage.setItem('creditos_vista', vista) }, [vista])

  const { ref: cardsRef, perPage: autoPerPage } = useAutoPageSize({ rows: 3 })
  const perPage = vista === 'cards' ? autoPerPage : PER_PAGE
  useEffect(() => { setPage(1) }, [perPage])

  const filtros: CreditoFiltros = {
    search: searchDebounced || undefined,
    estado: estado !== 'todos' ? estado : undefined,
    sort, page, per_page: perPage,
  }

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['creditos', filtros],
    queryFn: () => creditosApi.listar(filtros),
    placeholderData: keepPreviousData,
  })

  const creditos = data?.creditos.data ?? []
  const stats = data?.estadisticas
  const meta = data?.creditos
  // El boton "Limpiar" solo aparece con 2+ filtros: con uno solo se quita
  // directamente desde su propio control (la X del buscador o volver a "todos").
  const filtrosActivos = [!!search, estado !== 'todos', sort !== 'fecha_desc'].filter(Boolean).length
  const hayFiltros = filtrosActivos >= 2
  const limpiarFiltros = () => { setSearch(''); setEstado('todos'); setSort('fecha_desc'); setPage(1) }

  const abrirEditar = (c: Credito) => { setEditar(c); setFormOpen(true) }

  return (
    <>
      <PageHeader title="Créditos" subtitle="Control de créditos y abonos de clientes"
        action={<button className="btn btn-primary" onClick={() => { setEditar(null); setFormOpen(true) }}><I.Plus /> Nuevo crédito</button>} />

      {stats && (
        <KpiGrid items={[
          { label: 'Total', value: fmtN(stats.total_creditos), icon: I.Card, tone: 'accent', sub: 'créditos', onClick: () => { setEstado('todos'); setPage(1) }, activo: estado === 'todos' },
          { label: 'Activos', value: fmtN(stats.activos), icon: I.Clock, tone: 'warn', sub: 'sin liquidar', onClick: () => { setEstado(estado === 'activo' ? 'todos' : 'activo'); setPage(1) }, activo: estado === 'activo' },
          /* Abonados está contenido en Activos: un crédito con abonos sigue por
             cobrar. Por eso estas tarjetas ya no suman el Total. */
          { label: 'Abonados', value: fmtN(stats.abonados), icon: I.Wallet, tone: 'info', sub: 'de ellos, con abonos', onClick: () => { setEstado(estado === 'abonado' ? 'todos' : 'abonado'); setPage(1) }, activo: estado === 'abonado' },
          { label: 'Pagados', value: fmtN(stats.pagados), icon: I.CheckCircle, tone: 'pos', sub: 'liquidados', onClick: () => { setEstado(estado === 'pagado' ? 'todos' : 'pagado'); setPage(1) }, activo: estado === 'pagado' },
          { label: 'Pendiente por cobrar', value: fmtN(Number(stats.capital_pendiente)), currency: 'Q', icon: I.Cash, tone: 'neg', sub: 'capital pendiente' },
          { label: 'Recuperado', value: fmtN(stats.total_recuperado), currency: 'Q', icon: I.Trophy, tone: 'pos', sub: 'cobrado' },
        ]} />
      )}

      <div className="toolbar">
        <BuscadorToolbar placeholder="Buscar por cliente o concepto…" value={search} onChange={(v) => { setSearch(v); setPage(1) }} cargando={isFetching} />
        <Select value={estado} onValueChange={(v) => { setEstado(v); setPage(1) }} ariaLabel="Estado"
          options={[
            { value: 'todos', label: 'Todos los estados' },
            { value: 'activo', label: 'Activos' },
            { value: 'abonado', label: 'Abonados' },
            { value: 'pagado', label: 'Pagados' },
          ]} />
        <Select value={sort ?? 'fecha_desc'} onValueChange={(v) => { setSort(v as CreditoFiltros['sort']); setPage(1) }} ariaLabel="Orden"
          options={[
            { value: 'fecha_desc', label: 'Más recientes' },
            { value: 'fecha_asc', label: 'Más antiguos' },
            { value: 'monto_desc', label: 'Mayor capital' },
            { value: 'monto_asc', label: 'Menor capital' },
          ]} />
        {hayFiltros && <button className="btn" onClick={limpiarFiltros} title="Limpiar filtros"><X size={15} /> Limpiar</button>}
        <div className="view-toggle">
          <button data-on={vista === 'tabla'} onClick={() => setVista('tabla')} title="Vista de tabla"><List /></button>
          <button data-on={vista === 'cards'} onClick={() => setVista('cards')} title="Vista de tarjetas"><LayoutGrid /></button>
        </div>
      </div>

      {isLoading ? (
        <div className="card"><div className="empty" style={{ padding: 80 }}><Loader2 size={26} className="spin" style={{ color: 'var(--accent)' }} /><div>Cargando…</div></div></div>
      ) : isError ? (
        <div className="card"><div className="empty" style={{ padding: 80 }}><I.AlertCircle /><div>No se pudieron cargar los créditos</div>
          <button className="btn" style={{ marginTop: 10 }} onClick={() => refetch()}><I.Refresh /> Reintentar</button></div></div>
      ) : creditos.length === 0 ? (
        <div className="card"><div className="empty" style={{ padding: 80 }}><I.Card /><div>No se encontraron créditos</div></div></div>
      ) : vista === 'cards' ? (
        <>
          <div className="ccards" ref={cardsRef}>
            {creditos.map((c) => (
              <CreditoCard key={c.id} credito={c}
                onVer={() => navigate(`/creditos/${c.id}`)} onPagar={() => setPagar(c)}
                onEditar={() => abrirEditar(c)}
                onCondonar={() => setACerrar({ credito: c, modo: 'condonar' })}
                onAnular={() => setACerrar({ credito: c, modo: 'anular' })} />
            ))}
          </div>
          {meta && meta.last_page > 1 && <div className="card"><Pagination meta={meta} page={page} setPage={setPage} /></div>}
        </>
      ) : (
        <div className="card">
          <table className="tbl">
            <thead><tr>
              <th className="num" style={{ width: 48 }}>No.</th>
              <th>Cliente</th>
              <th className="num">Capital</th>
              <th className="num">Restante</th>
              <th style={{ width: 140 }}>Progreso</th>
              <th>Fecha</th>
              <th>Estado</th>
              <th style={{ width: 130, textAlign: 'right' }}>Acciones</th>
            </tr></thead>
            <tbody>
              {creditos.map((c, i) => {
                const badge = ESTADO_BADGE[c.estado]
                const pct = progresoPct(c)
                const abierto = estaAbierto(c)
                const concepto = c.producto_o_servicio_dado || (c.venta_id ? `Venta #${c.venta_id}` : null)
                return (
                  <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/creditos/${c.id}`)}>
                    <td className="num muted tnum">{(meta?.from ?? 1) + i}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{c.nombre_cliente}</div>
                      {concepto && (
                        c.venta_id ? (
                          <Link to={`/ventas?ver=${c.venta_id}`} className="link-venta" onClick={(e) => e.stopPropagation()} title={`Ver venta #${c.venta_id}`}>
                            <Receipt size={11} /> {concepto}
                          </Link>
                        ) : <div className="muted" style={{ fontSize: 11.5 }}>{concepto}</div>
                      )}
                    </td>
                    <td className="num tnum">{q(c.capital)}</td>
                    <td className="num tnum" style={{ fontWeight: 600, color: abierto ? undefined : 'var(--text-muted)' }}>{q(c.capital_restante)}</td>
                    <td><ProgresoBar pct={pct} /></td>
                    <td className="muted" style={{ fontSize: 12 }}>{fmtFecha(c.fecha_credito)}</td>
                    <td><span className="badge" data-tone={badge.tone}><span className="b-dot" />{badge.label}</span></td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <CreditoAcciones abierto={estaAbierto(c)} onVer={() => navigate(`/creditos/${c.id}`)}
                        onPagar={() => setPagar(c)} onEditar={() => abrirEditar(c)}
                        onCondonar={() => setACerrar({ credito: c, modo: 'condonar' })}
                        onAnular={() => setACerrar({ credito: c, modo: 'anular' })} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {meta && <Pagination meta={meta} page={page} setPage={setPage} />}
        </div>
      )}

      <CreditoForm open={formOpen} onClose={() => setFormOpen(false)} credito={editar} />
      <RegistrarPago open={!!pagar} onClose={() => setPagar(null)} credito={pagar} />

      <CerrarCredito credito={aCerrar?.credito ?? null} modo={aCerrar?.modo ?? 'condonar'}
        onClose={() => setACerrar(null)} />
    </>
  )
}

// ── Acciones compartidas (tabla y card) ───────────────────────────────────────

/**
 * Un crédito cerrado no admite abonos ni cierres: solo se consulta. Condonar y
 * anular sustituyen al viejo botón de eliminar, que borraba también los abonos.
 */
function CreditoAcciones({ abierto, onVer, onPagar, onEditar, onCondonar, onAnular }: {
  abierto: boolean; onVer: () => void; onPagar: () => void; onEditar: () => void
  onCondonar: () => void; onAnular: () => void
}) {
  return (
    <div className="row-actions">
      <button className="icon-action" data-variant="view" title="Ver detalle" onClick={onVer}><Eye /></button>
      {abierto && <>
        <button className="icon-action" data-variant="activate" title="Registrar pago" onClick={onPagar}><Wallet /></button>
        <button className="icon-action" data-variant="edit" title="Editar" onClick={onEditar}><Pencil /></button>
        <button className="icon-action" data-variant="edit" title="Condonar el saldo" onClick={onCondonar}><HandCoins /></button>
        <button className="icon-action" data-variant="delete" title="Anular crédito" onClick={onAnular}><Ban /></button>
      </>}
    </div>
  )
}

// ── Tarjeta de crédito ────────────────────────────────────────────────────────

function CreditoCard({ credito: c, onVer, onPagar, onEditar, onCondonar, onAnular }: {
  credito: Credito; onVer: () => void; onPagar: () => void; onEditar: () => void
  onCondonar: () => void; onAnular: () => void
}) {
  const badge = ESTADO_BADGE[c.estado]
  const pct = progresoPct(c)
  const abierto = estaAbierto(c)
  const concepto = c.producto_o_servicio_dado || (c.venta_id ? `Venta #${c.venta_id}` : null)
  return (
    <div className="ccard" onClick={onVer}>
      <div className="rc-head">
        <div style={{ minWidth: 0 }}>
          <div className="rc-title">{c.nombre_cliente}</div>
          {concepto && (
            c.venta_id ? (
              <Link to={`/ventas?ver=${c.venta_id}`} className="link-venta" onClick={(e) => e.stopPropagation()} title={`Ver venta #${c.venta_id}`}>
                <Receipt size={11} /> {concepto}
              </Link>
            ) : <div className="rc-sub">{concepto}</div>
          )}
        </div>
        <span className="badge" data-tone={badge.tone}><span className="b-dot" />{badge.label}</span>
      </div>

      <div className="rc-body">
        <div className="rc-line"><span className="lbl">Capital</span><span className="val tnum">{q(c.capital)}</span></div>
        <div className="rc-line"><span className="lbl">Restante</span><span className="val tnum" style={{ color: abierto ? undefined : 'var(--text-muted)' }}>{q(c.capital_restante)}</span></div>
        <ProgresoBar pct={pct} />
        <div className="rc-line"><span className="lbl">Fecha</span><span className="val">{fmtFecha(c.fecha_credito)}</span></div>
      </div>

      <div className="rc-foot" onClick={(e) => e.stopPropagation()}>
        <span className="rc-who">{pct}% pagado</span>
        <CreditoAcciones abierto={abierto} onVer={onVer} onPagar={onPagar} onEditar={onEditar}
          onCondonar={onCondonar} onAnular={onAnular} />
      </div>
    </div>
  )
}
