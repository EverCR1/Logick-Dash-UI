import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { I, type IconName } from '@/components/icons'
import { Sparkline, AreaChart, Donut, type DonutSegment } from '@/components/charts'
import { dashboardApi } from '@/lib/api'
import type { RangoSerie } from '@/lib/api/dashboard'
import { q, fmtN, pct } from '@/lib/format'
import type { DashboardData, Rentabilidad } from '@/types/dashboard'

type Tone = 'accent' | 'info' | 'violet' | 'warn' | 'pos' | 'neg'
type RentaVista = 'productos' | 'servicios' | 'total'

/** Etiqueta del rango activo; deja explícito qué periodo cubren los KPIs. */
const RANGO_LABEL: Record<RangoSerie, string> = {
  '7d': 'últimos 7 días',
  '30d': 'últimos 30 días',
  '90d': 'últimos 90 días',
  '1y': 'último año',
}

const METODO_INFO: Record<string, { label: string; icon: IconName }> = {
  efectivo: { label: 'Efectivo', icon: 'Cash' },
  tarjeta: { label: 'Tarjeta', icon: 'Card' },
  transferencia: { label: 'Transferencia', icon: 'Wallet' },
  mixto: { label: 'Mixto', icon: 'Receipt' },
  credito: { label: 'Crédito', icon: 'Receipt' },
}

const ESTADO_PEDIDO: Record<string, { tone: Tone; label: string }> = {
  pendiente: { tone: 'warn', label: 'Pendiente' },
  confirmado: { tone: 'info', label: 'Confirmado' },
  en_preparacion: { tone: 'info', label: 'En preparación' },
  enviado: { tone: 'violet', label: 'Enviado' },
  entregado: { tone: 'pos', label: 'Entregado' },
  cancelado: { tone: 'neg', label: 'Cancelado' },
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function HeroBanner() {
  const now = new Date()
  const fecha = now.toLocaleDateString('es-GT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const hora = now.toLocaleTimeString('es-GT', { hour: 'numeric', minute: '2-digit', hour12: true })
  return (
    <div className="hero-banner">
      <div>
        <div className="hero-greet">¡Hola, Admin! <span style={{ fontSize: 18 }}>👋</span></div>
        <div className="hero-sub">Aquí tienes el resumen de hoy.</div>
        <div className="hero-meta">
          <I.Cal size={13} />
          <span style={{ textTransform: 'capitalize' }}>{fecha}</span>
          <span className="dot-sep" />
          <I.Clock size={13} />
          <span>{hora}</span>
        </div>
      </div>
      <div className="hero-actions">
        <button className="btn"><I.Refresh /> Actualizar</button>
        <Link to="/ventas/nueva" className="btn btn-primary"><I.Plus /> Nueva venta</Link>
      </div>
    </div>
  )
}

function HeroKpi({ label, value, currency, sublabel, spark, sparkColor, icon, tone, to }: {
  label: string; value: string; currency?: string; sublabel: string
  spark: number[]; sparkColor?: string; icon: IconName; tone: Tone; to?: string
}) {
  const IconC = I[icon]
  const inner = (
    <>
      <div className="kpi-row1">
        <div className="kpi-label">{label}</div>
        <div className="kpi-icon" data-tone={tone}><IconC /></div>
      </div>
      <div className="kpi-value tnum">
        {currency && <span className="currency">{currency}</span>}
        {value}
      </div>
      <div className="kpi-meta"><span>{sublabel}</span></div>
      {spark.length > 1 && <Sparkline data={spark} color={sparkColor || 'var(--accent)'} />}
    </>
  )
  return to
    ? <Link to={to} className="kpi kpi-link">{inner}</Link>
    : <div className="kpi">{inner}</div>
}

function HeroKpiGrid({ d }: { d: DashboardData }) {
  const tendencia = d.serie_ventas.serie.map((p) => p.current)
  return (
    <div className="kpi-grid">
      <HeroKpi label="Ventas hoy" value={fmtN(d.ventas.hoy.total)} currency="Q"
        sublabel={`${d.ventas.hoy.count} transacciones`} spark={tendencia.slice(-14)} icon="Cart" tone="accent" />
      <HeroKpi label="Esta semana" value={fmtN(d.ventas.semana.total)} currency="Q"
        sublabel={`${d.ventas.semana.count} transacciones`} spark={tendencia.slice(-10)} sparkColor="var(--info)" icon="Cal" tone="info" />
      <HeroKpi label="Este mes" value={fmtN(d.ventas.mes.total)} currency="Q"
        sublabel={`${d.ventas.mes.count} transacciones`} spark={tendencia} sparkColor="var(--violet)" icon="TrendUp" tone="violet" />
      <HeroKpi label="Promedio / venta" value={fmtN(d.ventas.promedio_venta)} currency="Q"
        sublabel={`Máx ${q(d.ventas.venta_maxima)} esta semana`} spark={tendencia} sparkColor="var(--warn)" icon="Activity" tone="warn" />
    </div>
  )
}

// ── Rentabilidad ────────────────────────────────────────────────────────────────

function SegToggle<T extends string>({ value, onChange, options }: {
  value: T; onChange: (v: T) => void; options: { v: T; l: string }[]
}) {
  return (
    <div className="seg-toggle">
      {options.map((o) => (
        <button key={o.v} type="button" className="seg-btn" data-on={value === o.v} onClick={() => onChange(o.v)}>{o.l}</button>
      ))}
    </div>
  )
}

function Delta({ value, unit }: { value: number | null; unit: string }) {
  if (value == null) return null
  const up = value >= 0
  return (
    <span className="kpi-delta" data-dir={up ? 'up' : 'down'}>
      {up ? <I.ArrowUp /> : <I.ArrowDown />} {up ? '+' : '−'}{fmtN(Math.abs(value))}{unit}
    </span>
  )
}

const RENTA_OPC: { v: RentaVista; l: string }[] = [
  { v: 'productos', l: 'Prod' }, { v: 'servicios', l: 'Serv' }, { v: 'total', l: 'Todo' },
]

function RentabilidadRow({ r, rango, fetching }: { r: Rentabilidad; rango: RangoSerie; fetching?: boolean }) {
  const [vista, setVista] = useState<RentaVista>(() => (localStorage.getItem('dash_renta_vista') as RentaVista) || 'total')
  useEffect(() => { localStorage.setItem('dash_renta_vista', vista) }, [vista])
  const b = r[vista]

  return (
    <>
      <div className="section-title">
        <I.TrendUp size={13} /><span>Rentabilidad</span>
        <span className="section-rango">{RANGO_LABEL[rango]}</span>
        <div className="line" />
        <SegToggle value={vista} onChange={setVista} options={RENTA_OPC} />
      </div>
      <div className="row-3" style={{ opacity: fetching ? 0.6 : 1, transition: 'opacity .15s' }}>
        <div className="kpi">
          <div className="kpi-row1">
            <div className="kpi-label">Margen de ganancia</div>
            <div className="kpi-icon" data-tone="accent"><I.Activity /></div>
          </div>
          <div className="kpi-value tnum">{fmtN(b.margen_pct)}<span className="kpi-unit">%</span></div>
          <div className="kpi-meta"><Delta value={b.margen_delta_pts} unit=" pts" /><span>vs. periodo anterior</span></div>
        </div>

        <div className="kpi">
          <div className="kpi-row1">
            <div className="kpi-label">Rentabilidad</div>
            <div className="kpi-icon" data-tone="violet"><I.Wallet /></div>
          </div>
          <div className="kpi-value tnum"><span className="currency">Q</span>{fmtN(b.utilidad)}</div>
          <div className="kpi-meta"><Delta value={b.utilidad_delta_pct} unit="%" /><span>{b.top_item ? `Top: ${b.top_item}` : 'utilidad bruta'}</span></div>
        </div>

        <div className="kpi">
          <div className="kpi-row1">
            <div className="kpi-label">Rotación de inventario</div>
            <div className="kpi-icon" data-tone="pos"><I.Refresh /></div>
          </div>
          <div className="kpi-value tnum">{fmtN(r.rotacion.veces)}<span className="kpi-unit">×</span></div>
          <div className="kpi-meta"><Delta value={r.rotacion.delta} unit="×" /><span>promedio del catálogo</span></div>
        </div>
      </div>
    </>
  )
}

function RotacionCategorias({ r }: { r: Rentabilidad }) {
  const cats = r.rotacion_categorias
  const max = Math.max(...cats.map((c) => c.veces), 1)
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title"><span className="card-title-dot" style={{ background: 'var(--accent)' }} />Rotación por categoría</div>
        <span className="badge">Veces / mes</span>
      </div>
      {cats.length === 0 ? (
        <div className="empty"><I.Layers /><div>Sin datos de rotación este mes</div></div>
      ) : (
        <div className="card-pad rot-cats">
          {cats.map((c) => (
            <div key={c.nombre} className="rot-cat">
              <span className="rot-cat-name">{c.nombre}</span>
              <span className="rot-cat-bar"><span style={{ width: `${(c.veces / max) * 100}%` }} /></span>
              <span className="rot-cat-val tnum">{fmtN(c.veces)}×</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const ESTADO_STOCK: Record<string, { tone: Tone; label: string }> = {
  ok: { tone: 'pos', label: 'En stock' },
  bajo: { tone: 'warn', label: 'Bajo' },
  agotado: { tone: 'neg', label: 'Agotado' },
}

function RentabilidadPorItem({ r }: { r: Rentabilidad }) {
  const [vista, setVista] = useState<'productos' | 'servicios'>('productos')
  const esProd = vista === 'productos'
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title"><span className="card-title-dot" style={{ background: 'var(--violet)' }} />Rentabilidad por {esProd ? 'producto' : 'servicio'}</div>
        <div className="card-actions">
          <SegToggle value={vista} onChange={setVista} options={[{ v: 'productos', l: 'Productos' }, { v: 'servicios', l: 'Servicios' }]} />
          <Link to="/reportes" className="link-arrow">Ver todo <I.ArrowRight /></Link>
        </div>
      </div>
      {esProd ? (
        r.items_productos.length === 0 ? (
          <div className="empty"><I.Package /><div>Sin productos vendidos este mes</div></div>
        ) : (
          <table className="tbl">
            <thead><tr><th>Producto</th><th className="num">Stock</th><th className="num">Precio</th><th className="num">Margen</th><th className="num">Util/u</th><th>Estado</th></tr></thead>
            <tbody>
              {r.items_productos.map((p, i) => {
                const e = ESTADO_STOCK[p.estado] ?? ESTADO_STOCK.ok
                return (
                  <tr key={p.nombre + i}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{p.nombre}</div>
                      <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>{p.categoria}</div>
                    </td>
                    <td className="num tnum">{p.stock} <span className="muted">/ {p.stock_minimo}</span></td>
                    <td className="num tnum">{q(p.precio)}</td>
                    <td className="num tnum" style={{ color: 'var(--pos)', fontWeight: 600 }}>{fmtN(p.margen_pct)}%</td>
                    <td className="num tnum">{q(p.utilidad_u)}</td>
                    <td><span className="badge" data-tone={e.tone}><span className="b-dot" />{e.label}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )
      ) : (
        r.items_servicios.length === 0 ? (
          <div className="empty"><I.Boxes /><div>Sin servicios realizados este mes</div></div>
        ) : (
          <table className="tbl">
            <thead><tr><th>Servicio</th><th className="num">Realizados</th><th className="num">Precio</th><th className="num">Margen</th><th className="num">Util/u</th></tr></thead>
            <tbody>
              {r.items_servicios.map((s, i) => (
                <tr key={s.nombre + i}>
                  <td style={{ fontWeight: 500 }}>{s.nombre}</td>
                  <td className="num tnum">{s.unidades}</td>
                  <td className="num tnum">{q(s.precio)}</td>
                  <td className="num tnum" style={{ color: 'var(--pos)', fontWeight: 600 }}>{fmtN(s.margen_pct)}%</td>
                  <td className="num tnum">{q(s.utilidad_u)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}
    </div>
  )
}

// ── Sales chart ───────────────────────────────────────────────────────────────

/**
 * Agrupa lo que depende del selector de rango: la gráfica y los KPIs de rentabilidad.
 * El estado vive aquí (y no dentro de la gráfica) para que ambos se muevan juntos,
 * que es lo que el usuario espera al verlos en la misma pantalla.
 */
function BloqueRango({ d }: { d: DashboardData }) {
  const [range, setRange] = useState<RangoSerie>('30d')
  const { data, isFetching } = useQuery({
    queryKey: ['dashboard-serie', range],
    queryFn: () => dashboardApi.serieVentas(range),
    // El índice del dashboard ya trae el rango por defecto: evita repetir la petición
    initialData: range === '30d' ? { serie_ventas: d.serie_ventas, rentabilidad: d.rentabilidad } : undefined,
    placeholderData: (prev) => prev,
    staleTime: 1000 * 60 * 2,
  })

  const sv = data?.serie_ventas ?? d.serie_ventas
  const r = data?.rentabilidad ?? d.rentabilidad

  return (
    <>
      <RentabilidadRow r={r} rango={range} fetching={isFetching} />
      <SalesChartCard sv={sv} range={range} setRange={setRange} isFetching={isFetching} />
      <div className="row-2">
        <RentabilidadPorItem r={r} />
        <RotacionCategorias r={r} />
      </div>
    </>
  )
}

function SalesChartCard({ sv, range, setRange, isFetching }: {
  sv: DashboardData['serie_ventas']
  range: RangoSerie
  setRange: (r: RangoSerie) => void
  isFetching?: boolean
}) {
  const { serie, ingreso_total, transacciones, ticket_promedio } = sv
  const sumPrev = serie.reduce((s, p) => s + p.previous, 0)
  const delta = sumPrev > 0 ? ((ingreso_total - sumPrev) / sumPrev) * 100 : 0
  const dir = delta >= 0 ? 'up' : 'down'

  const tabs: { v: RangoSerie; l: string }[] = [
    { v: '7d', l: '7D' }, { v: '30d', l: '30D' }, { v: '90d', l: '90D' }, { v: '1y', l: '1A' },
  ]

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title"><span className="card-title-dot" />Ventas en el tiempo</div>
        <div className="card-actions">
          <div className="tabs">
            {tabs.map((t) => (
              <button key={t.v} className="tab" data-active={range === t.v} onClick={() => setRange(t.v)}>{t.l}</button>
            ))}
          </div>
          <button className="btn btn-ghost" style={{ height: 30, padding: '0 8px' }}><I.More /></button>
        </div>
      </div>
      <div className="chart-wrap" style={{ opacity: isFetching ? 0.6 : 1, transition: 'opacity .15s' }}>
        <div className="chart-summary">
          <div className="chart-stat">
            <div className="label">Ingreso total</div>
            <div className="value tnum">{q(ingreso_total)}</div>
            <div className="delta" style={{ color: dir === 'up' ? 'var(--pos)' : 'var(--neg)' }}>
              {dir === 'up' ? <I.ArrowUp size={11} style={{ verticalAlign: -1 }} /> : <I.ArrowDown size={11} style={{ verticalAlign: -1 }} />}
              {' '}{pct(Math.abs(delta))} vs. periodo anterior
            </div>
          </div>
          <div className="chart-stat">
            <div className="label">Transacciones</div>
            <div className="value tnum">{fmtN(transacciones)}</div>
          </div>
          <div className="chart-stat">
            <div className="label">Ticket promedio</div>
            <div className="value tnum">{q(ticket_promedio)}</div>
          </div>
          <div className="chart-legend">
            <span><span className="swatch" style={{ background: 'var(--accent)' }} />Actual</span>
            <span><span className="swatch" style={{ background: 'var(--info)', opacity: 0.55 }} />Periodo anterior</span>
          </div>
        </div>
        <AreaChart data={serie} height={240} />
      </div>
    </div>
  )
}

// ── KPIs compactos ─────────────────────────────────────────────────────────────

function CompactKpi({ label, icon, tone, value, currency, children, to }: {
  label: string; icon: IconName; tone: Tone; value?: string; currency?: string; children?: React.ReactNode; to?: string
}) {
  const IconC = I[icon]
  const inner = (
    <>
      <div className="kpi-row1">
        <div className="kpi-label">{label}</div>
        <div className="kpi-icon" data-tone={tone}><IconC /></div>
      </div>
      {value != null && (
        <div className="kpi-value tnum">{currency && <span className="currency">{currency}</span>}{value}</div>
      )}
      <div className="kpi-meta">{children}</div>
    </>
  )
  return to
    ? <Link to={to} className="kpi kpi-compact kpi-link">{inner}</Link>
    : <div className="kpi kpi-compact">{inner}</div>
}

// Tira compacta con los contadores de catálogo: son datos que casi no cambian
// día a día (a diferencia de ventas/rentabilidad), así que van en una sola fila
// delgada en vez de ocupar una card grande cada uno. Cada stat lleva a su módulo.
function MiniStat({ to, icon, label, value, tone, badge }: {
  to: string; icon: IconName; label: string; value: string; tone: Tone
  badge?: { tone: Tone; text: string }
}) {
  const IconC = I[icon]
  return (
    <Link to={to} className="mini-stat">
      <span className="mini-stat-icon" data-tone={tone}><IconC /></span>
      <span className="mini-stat-body">
        <span className="mini-stat-value tnum">{value}</span>
        <span className="mini-stat-label">{label}</span>
      </span>
      {badge && <span className="badge" data-tone={badge.tone}><span className="b-dot" />{badge.text}</span>}
    </Link>
  )
}

function ResumenNegocio({ d }: { d: DashboardData }) {
  return (
    <div className="card mini-stat-strip">
      <MiniStat to="/clientes" icon="Users" tone="accent" label="Clientes" value={fmtN(d.clientes.total)}
        badge={d.clientes.nuevos_semana > 0 ? { tone: 'pos', text: `+${d.clientes.nuevos_semana} esta semana` } : undefined} />
      <MiniStat to="/productos" icon="Package" tone="info" label="Productos" value={fmtN(d.productos.total)}
        badge={d.productos.agotados > 0 ? { tone: 'neg', text: `${d.productos.agotados} agotados` } : d.productos.stock_bajo > 0 ? { tone: 'warn', text: `${d.productos.stock_bajo} bajo stock` } : undefined} />
      <MiniStat to="/productos" icon="Boxes" tone="pos" label="Valor de inventario" value={`Q ${fmtN(d.productos.valor_inventario)}`} />
      <MiniStat to="/servicios" icon="Boxes" tone="info" label="Servicios" value={fmtN(d.servicios.total)} />
      <MiniStat to="/creditos" icon="Card" tone="violet" label="Créditos activos" value={fmtN(d.creditos.activos)}
        badge={d.creditos.capital_pendiente > 0 ? { tone: 'warn', text: `${q(d.creditos.capital_pendiente)} pend.` } : undefined} />
      <MiniStat to="/proveedores" icon="Truck" tone="warn" label="Proveedores" value={fmtN(d.proveedores.total)} />
      <MiniStat to="/categorias" icon="Tag" tone="accent" label="Categorías" value={fmtN(d.categorias.total)} />
    </div>
  )
}

function TiendaEnLineaKpis({ d }: { d: DashboardData }) {
  const t = d.tienda
  return (
    <>
      <div className="section-title">
        <I.Store size={13} /><span>Tienda en línea</span>
        <div className="line" />
        <Link to="/pedidos" className="link-arrow">Ver pedidos <I.ArrowRight /></Link>
      </div>
      <div className="kpi-grid">
        <CompactKpi to="/pedidos" label="Pedidos hoy" icon="Inbox" tone="accent" value={fmtN(t.pedidos_hoy)}>
          <span>nuevos en las últimas 24h</span>
        </CompactKpi>
        <CompactKpi to="/pedidos" label="Pedidos este mes" icon="Cal" tone="info" value={fmtN(t.pedidos_mes)}>
          {t.pedidos_mes_delta != null && (
            <span className="kpi-delta" data-dir={t.pedidos_mes_delta >= 0 ? 'up' : 'down'}>
              {t.pedidos_mes_delta >= 0 ? <I.ArrowUp /> : <I.ArrowDown />} {Math.abs(t.pedidos_mes_delta)}%
            </span>
          )}
          <span>vs. mes anterior</span>
        </CompactKpi>
        <CompactKpi to="/pedidos" label="Ingresos tienda" icon="Wallet" tone="pos" value={fmtN(t.ingresos_mes)} currency="Q">
          <span>pedidos entregados este mes</span>
        </CompactKpi>
        <CompactKpi to="/pedidos" label="Pendientes" icon="Clock" tone="warn" value={fmtN(t.pendientes)}>
          <span className="badge" data-tone="warn"><span className="b-dot" />requieren atención</span>
        </CompactKpi>
      </div>
    </>
  )
}

function DonutCard({ d }: { d: DashboardData }) {
  const pe = d.tienda.por_estado
  const segments: DonutSegment[] = [
    { label: 'Pendiente', value: pe.pendiente ?? 0, color: 'var(--warn)' },
    { label: 'Confirmado', value: pe.confirmado ?? 0, color: 'var(--info)' },
    { label: 'Entregado', value: pe.entregado ?? 0, color: 'var(--pos)' },
  ].filter((s) => s.value > 0)
  const total = segments.reduce((s, x) => s + x.value, 0)

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title"><span className="card-title-dot" />Pedidos por estado</div>
        <Link to="/pedidos" className="link-arrow">Ver todos <I.ArrowRight /></Link>
      </div>
      <div className="donut-row">
        <div className="donut-wrap">
          <Donut segments={segments.length ? segments : [{ label: '—', value: 1, color: 'var(--bg-elev-3)' }]} size={172} thickness={20} />
          <div className="donut-center">
            <div className="v tnum">{total}</div>
            <div className="l">pedidos</div>
          </div>
        </div>
        <div className="donut-legend">
          {segments.map((s) => (
            <div key={s.label} className="donut-legend-row">
              <span className="sw" style={{ background: s.color }} />
              <span>{s.label}</span>
              <span className="count tnum">{s.value}</span>
              <span className="pct tnum">{total ? Math.round((s.value / total) * 100) : 0}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ModeracionCard({ d }: { d: DashboardData }) {
  const { resenas, preguntas } = d.tienda
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title"><span className="card-title-dot" style={{ background: 'var(--warn)' }} />Moderación</div>
        <Link to="/reportes-tienda" className="link-arrow">Reporte tienda <I.ArrowRight /></Link>
      </div>
      <div className="mod-grid">
        <div className="mod-col">
          <div className="mod-head"><I.Star /> Reseñas</div>
          <div className="mod-row"><span><span className="dot" style={{ background: 'var(--warn)' }} />Pendientes</span><span className="v">{resenas.pendiente}</span></div>
          <div className="mod-row"><span><span className="dot" style={{ background: 'var(--pos)' }} />Publicadas</span><span className="v">{resenas.publicado}</span></div>
          <div className="mod-row"><span><span className="dot" style={{ background: 'var(--neg)' }} />Rechazadas</span><span className="v">{resenas.rechazado}</span></div>
        </div>
        <div className="mod-col">
          <div className="mod-head"><I.Help /> Preguntas</div>
          <div className="mod-row"><span><span className="dot" style={{ background: 'var(--warn)' }} />Pendientes</span><span className="v">{preguntas.pendiente}</span></div>
          <div className="mod-row"><span><span className="dot" style={{ background: 'var(--info)' }} />Respondidas</span><span className="v">{preguntas.respondida}</span></div>
          <div className="mod-row"><span><span className="dot" style={{ background: 'var(--neg)' }} />Rechazadas</span><span className="v">{preguntas.rechazada}</span></div>
        </div>
      </div>
      <div className="mod-footer">
        <Link to="/resenas" className="mod-link"><I.Star /> Moderar reseñas</Link>
        <Link to="/preguntas" className="mod-link"><I.Help /> Responder preguntas</Link>
      </div>
    </div>
  )
}

function TopProductos({ d }: { d: DashboardData }) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title"><span className="card-title-dot" style={{ background: 'var(--accent)' }} />Productos más vendidos</div>
        <Link to="/productos" className="link-arrow">Ver inventario <I.ArrowRight /></Link>
      </div>
      {d.top_productos.length === 0 ? (
        <div className="empty"><I.Package /><div>Sin ventas registradas este mes</div></div>
      ) : (
        <table className="tbl">
          <thead><tr><th style={{ width: 38 }}>#</th><th>Producto</th><th className="num">Vendidos</th><th className="num">Ingreso</th></tr></thead>
          <tbody>
            {d.top_productos.map((p, i) => (
              <tr key={p.sku + i}>
                <td><span className="rank" data-r={i + 1}>{i + 1}</span></td>
                <td>
                  <div style={{ fontWeight: 500 }}>{p.name}</div>
                  <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>{p.sku}</div>
                </td>
                <td className="num tnum">{p.sold}</td>
                <td className="num tnum" style={{ fontWeight: 600 }}>{q(p.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function TopClientes({ d }: { d: DashboardData }) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title"><span className="card-title-dot" style={{ background: 'var(--violet)' }} />Top clientes</div>
        <Link to="/clientes" className="link-arrow">Ver todos <I.ArrowRight /></Link>
      </div>
      {d.top_clientes.length === 0 ? (
        <div className="empty"><I.Users /><div>Sin clientes con compras este mes</div></div>
      ) : (
        <table className="tbl">
          <thead><tr><th>Cliente</th><th className="num">Compras</th><th className="num">Total</th></tr></thead>
          <tbody>
            {d.top_clientes.map((c, i) => (
              <tr key={c.name + i}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="avatar" style={{ width: 28, height: 28, fontSize: 11 }}>{c.initials}</div>
                    <span style={{ fontWeight: 500 }}>{c.name}</span>
                  </div>
                </td>
                <td className="num"><span className="badge" data-tone="info">{c.compras}</span></td>
                <td className="num tnum" style={{ fontWeight: 600 }}>{q(c.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function MetodosPago({ d }: { d: DashboardData }) {
  const colors = ['var(--accent)', 'var(--info)', 'var(--violet)', 'var(--warn)', 'var(--neg)']
  const items = d.metodos_pago.items
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title"><span className="card-title-dot" style={{ background: 'var(--info)' }} />Métodos de pago</div>
        <span className="badge">Este mes</span>
      </div>
      <div className="card-pad">
        <div className="stacked-bar">
          {items.map((m, i) => (
            <span key={m.metodo} style={{ width: `${m.share * 100}%`, background: colors[i % colors.length] }} />
          ))}
        </div>
        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
          <span>Total recibido</span>
          <span className="tnum" style={{ fontWeight: 600, color: 'var(--text)' }}>{q(d.metodos_pago.total)}</span>
        </div>
      </div>
      <div className="list">
        {items.map((m, i) => {
          const info = METODO_INFO[m.metodo] ?? { label: m.metodo, icon: 'Receipt' as IconName }
          const IconC = I[info.icon]
          return (
            <div key={m.metodo} className="list-row">
              <div className="left">
                <span style={{ width: 8, height: 8, borderRadius: 2, background: colors[i % colors.length] }} />
                <IconC />
                <span style={{ fontWeight: 500 }}>{info.label}</span>
                <span className="muted tnum" style={{ fontSize: 11.5 }}>{Math.round(m.share * 100)}%</span>
              </div>
              <span className="val">{q(m.value)}</span>
            </div>
          )
        })}
        {items.length === 0 && <div className="empty"><I.Cash /><div>Sin pagos registrados este mes</div></div>}
      </div>
    </div>
  )
}

function PedidosRecientes({ d }: { d: DashboardData }) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title"><span className="card-title-dot" style={{ background: 'var(--warn)' }} />Pedidos recientes</div>
        <Link to="/pedidos" className="link-arrow">Ver pedidos <I.ArrowRight /></Link>
      </div>
      {d.pedidos_recientes.length === 0 ? (
        <div className="empty"><I.Store /><div>Sin pedidos recientes</div></div>
      ) : (
        <table className="tbl">
          <thead><tr><th>Pedido</th><th>Cliente</th><th>Estado</th><th className="num">Total</th></tr></thead>
          <tbody>
            {d.pedidos_recientes.map((p) => {
              const e = ESTADO_PEDIDO[p.estado] ?? { tone: 'info' as Tone, label: p.estado }
              return (
                <tr key={p.numero}>
                  <td style={{ fontWeight: 500 }}>#{p.numero}</td>
                  <td>{p.cliente}</td>
                  <td><span className="badge" data-tone={e.tone}><span className="b-dot" />{e.label}</span></td>
                  <td className="num tnum" style={{ fontWeight: 600 }}>{q(p.total)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data: d, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardApi.resumen,
    staleTime: 1000 * 60 * 2,
  })

  if (isLoading) {
    return (
      <div className="empty" style={{ padding: 120 }}>
        <Loader2 size={28} className="spin" style={{ color: 'var(--accent)' }} />
        <div style={{ marginTop: 8 }}>Cargando estadísticas…</div>
      </div>
    )
  }

  if (isError || !d) {
    return (
      <div className="empty" style={{ padding: 120 }}>
        <I.AlertCircle />
        <div style={{ marginTop: 8, fontWeight: 500, color: 'var(--text-muted)' }}>No se pudieron cargar las estadísticas</div>
        <button className="btn" style={{ marginTop: 12 }} onClick={() => refetch()}>
          <I.Refresh /> Reintentar
        </button>
      </div>
    )
  }

  return (
    <>
      <HeroBanner />
      <HeroKpiGrid d={d} />
      <BloqueRango d={d} />
      <ResumenNegocio d={d} />
      <TiendaEnLineaKpis d={d} />
      <div className="row-2">
        <DonutCard d={d} />
        <ModeracionCard d={d} />
      </div>
      <div className="row-12">
        <TopProductos d={d} />
        <TopClientes d={d} />
      </div>
      <div className="row-12">
        <MetodosPago d={d} />
        <PedidosRecientes d={d} />
      </div>
    </>
  )
}
