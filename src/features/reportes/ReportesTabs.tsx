import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import {
  ShoppingCart, Coins, TrendingUp, Users, UserCheck, UserPlus, ShoppingBag,
  Package, AlertTriangle, Wallet, Boxes, Building2, Trophy, Receipt,
  Store, ClipboardList, CircleDollarSign, Layers, Ban, CreditCard, Clock, ShieldCheck,
  ListTree,
} from 'lucide-react'
import { AreaChart, Sparkline } from '@/components/charts'
import { Select } from '@/components/ui/Select'
import { rangoDePeriodo, type Periodo } from '@/components/ui/RangoFechas'
import { Pagination } from '@/components/ui/Pagination'
import { KpiGrid } from '@/components/ui/KpiGrid'
import { reportesApi, catalogosApi } from '@/lib/api'
import { usePaginacionLocal } from '@/lib/hooks'
import { q, fmtN, pct, fmtFecha, fechaLocal } from '@/lib/format'
import { ESTADO_VENTA, METODO_LABEL, METODO_TONE } from '../ventas/venta-estados'
import {
  EstadoCarga, Insight, BarRow, RankList, HeroStats, BadgeVariacion, LeyendaTendencia,
  construirTendencia, variacion, rangoPrevio, desplazarDias, type RankItem, type Tono,
} from './reportes-utils'
import { BotonesExportar } from './BotonesExportar'
import type { ReporteExportData } from './ReportePDF'

interface RangoProps { desde: string; hasta: string }

/**
 * Salida del resumen hacia la vista de detalle del módulo, arrastrando el rango
 * de fechas activo para no obligar a volver a elegirlo.
 */
function BotonDetalle({ modulo, desde, hasta }: { modulo: string; desde?: string; hasta?: string }) {
  // Sin rango (inventario), el detalle aplica el suyo por defecto
  const query = desde && hasta ? `?desde=${desde}&hasta=${hasta}` : ''

  return (
    <Link className="btn" to={`/reportes/detalle/${modulo}${query}`}>
      <ListTree size={14} /> Ver detalle
    </Link>
  )
}

/**
 * Enlaces del resumen hacia el detalle que desarrolla cada cifra.
 *
 * Cada tarjeta lleva su propio rango: "Hoy" abre el día, "Mes actual" el mes.
 * Sin eso el detalle se abriría con el rango por defecto y mostraría otra cifra
 * distinta a la que se pulsó, que es peor que no enlazar.
 */
function detalle(modulo: string, extra: Record<string, string> = {}, periodo?: Exclude<Periodo, 'personalizado'>) {
  const rango = periodo ? rangoDePeriodo(periodo) : null
  const params = new URLSearchParams({
    ...(rango ? { desde: rango.desde, hasta: rango.hasta } : {}),
    ...extra,
  })
  const query = params.toString()
  return `/reportes/detalle/${modulo}${query ? `?${query}` : ''}`
}

/** Detalle de ganancias acotado a un producto o servicio concreto. */
function enlaceItem(it: { producto_id: number | null; servicio_id: number | null }, desde: string, hasta: string) {
  const clave = it.producto_id ? `producto_id=${it.producto_id}` : `servicio_id=${it.servicio_id}`
  return `/reportes/detalle/ganancias?desde=${desde}&hasta=${hasta}&${clave}`
}
const base = ({ desde, hasta }: RangoProps) => ({ fecha_inicio: desde, fecha_fin: hasta })
const limpio = (v: string) => (v && v !== 'todos' ? v : undefined)
const rangoTxt = (desde: string, hasta: string) => `Del ${fmtFecha(desde)} al ${fmtFecha(hasta)}`

// Color CSS a partir de un tono del sistema
const colorTono = (t?: string) => (t ? `var(--${t})` : 'var(--text-faint)')

// Serie diaria (suma por día, orden cronológico) para el sparkline del periodo
function serieDiaria<T>(filas: T[], fecha: (r: T) => string, valor: (r: T) => number): number[] {
  const mapa = new Map<string, number>()
  for (const f of filas) {
    const dia = (fecha(f) ?? '').slice(0, 10)
    if (!dia) continue
    mapa.set(dia, (mapa.get(dia) ?? 0) + Number(valor(f) || 0))
  }
  return [...mapa.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v)
}

// Agrupa filas por nombre y devuelve el top N por monto
function topPorNombre<T>(filas: T[], nombre: (r: T) => string, valor: (r: T) => number, n = 5) {
  const mapa = new Map<string, { total: number; veces: number }>()
  for (const f of filas) {
    const k = nombre(f)
    const prev = mapa.get(k) ?? { total: 0, veces: 0 }
    mapa.set(k, { total: prev.total + Number(valor(f) || 0), veces: prev.veces + 1 })
  }
  return [...mapa.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, n)
}

function Bloque({ titulo, icon: Icon, children, action, iconColor }: {
  titulo: string; icon?: React.ComponentType<{ size?: number; style?: React.CSSProperties }>
  children: React.ReactNode; action?: React.ReactNode; iconColor?: string
}) {
  return (
    <div className="card">
      <div className="card-header" style={{ justifyContent: 'space-between' }}>
        <div className="card-title">{Icon && <Icon size={15} style={{ color: iconColor ?? 'var(--text-muted)' }} />}{titulo}</div>
        {action}
      </div>
      {children}
    </div>
  )
}

// Card con cifras grandes del periodo + badge opcional
function Hero({ titulo, badge, children }: { titulo: string; badge?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title"><span className="card-title-dot" />{titulo}</div>
        {badge}
      </div>
      {children}
    </div>
  )
}

// Desglose en barras horizontales (reemplaza los donuts)
function DesgloseBarras({ titulo, icon, data, etiqueta, tono }: {
  titulo: string; icon?: React.ComponentType<{ size?: number; style?: React.CSSProperties }>
  data: Record<string, { cantidad: number; total: number }>
  etiqueta?: (k: string) => string; tono?: (k: string) => string | undefined
}) {
  const entradas = Object.entries(data ?? {})
  if (entradas.length === 0) return null
  const total = entradas.reduce((s, [, v]) => s + Number(v.total || 0), 0)
  return (
    <Bloque titulo={titulo} icon={icon}>
      <div className="card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {entradas.map(([k, v]) => (
          <BarRow key={k} label={`${etiqueta?.(k) ?? (k || 'N/D')} · ${fmtN(v.cantidad)}`}
            valor={v.total} total={total} display={q(v.total)} color={colorTono(tono?.(k))} />
        ))}
      </div>
    </Bloque>
  )
}

// ── Resumen general ───────────────────────────────────────────────────────
export function TabResumen() {
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['rep-resumen'], queryFn: reportesApi.resumen })
  const d = data?.data

  // Tendencia de los últimos 14 días contra los 14 previos.
  const hastaTend = fechaLocal()
  const desdeTend = desplazarDias(hastaTend, -13)
  const previoTend = rangoPrevio(desdeTend, hastaTend)
  const { data: tendActual } = useQuery({
    queryKey: ['rep-ventas', desdeTend, hastaTend, 'todos', 'todos'],
    queryFn: () => reportesApi.ventas(base({ desde: desdeTend, hasta: hastaTend })),
  })
  const { data: tendPrevia } = useQuery({
    queryKey: ['rep-ventas', previoTend.desde, previoTend.hasta, 'todos', 'todos'],
    queryFn: () => reportesApi.ventas(base(previoTend)),
  })

  const tendencia = construirTendencia(desdeTend, hastaTend, tendActual?.ventas ?? [], tendPrevia?.ventas ?? [])
  const delta = variacion(tendencia.totalActual, tendencia.totalPrevio)
  const ventas14 = tendActual?.resumen
  const exportData: ReporteExportData | null = d ? {
    titulo: 'Resumen general',
    kpis: [
      { label: 'Ventas hoy', value: q(d.ventas.hoy) }, { label: 'Ventas mes', value: q(d.ventas.mes) },
      { label: 'Histórico', value: q(d.ventas.total) }, { label: 'Clientes', value: fmtN(d.clientes.total) },
      { label: 'Productos', value: fmtN(d.productos.total) }, { label: 'Valor inventario', value: q(d.productos.valor_inventario) },
    ],
    tablas: [{
      titulo: 'Indicadores', columnas: [{ label: 'Indicador' }, { label: 'Valor', align: 'right' }],
      filas: [
        ['Ventas hoy', q(d.ventas.hoy)], ['Ventas semana', q(d.ventas.semana)], ['Ventas mes', q(d.ventas.mes)], ['Ventas histórico', q(d.ventas.total)],
        ['Clientes total', fmtN(d.clientes.total)], ['Clientes activos', fmtN(d.clientes.activos)], ['Clientes con ventas', fmtN(d.clientes.con_ventas)],
        ['Productos', fmtN(d.productos.total)], ['Stock bajo', fmtN(d.productos.stock_bajo)], ['Agotados', fmtN(d.productos.agotados)], ['Valor inventario', q(d.productos.valor_inventario)],
        ['Usuarios', fmtN(d.usuarios.total)], ['Usuarios activos', fmtN(d.usuarios.activos)],
      ],
    }],
  } : null

  const tasaClientes = d && d.clientes.total > 0 ? Math.round((d.clientes.activos / d.clientes.total) * 100) : 0
  const disponibilidad = d && d.productos.total > 0 ? Math.round(((d.productos.total - d.productos.agotados) / d.productos.total) * 100) : 0

  return (
    <EstadoCarga isLoading={isLoading} isError={isError} vacio={!d} refetch={refetch}>
      {d && (
        <div style={{ display: 'grid', gap: 18 }}>
          <div className="rep-acciones"><BotonesExportar data={exportData} /></div>

          <Hero titulo="Ventas — últimos 14 días" badge={<BadgeVariacion valor={delta} />}>
            <div className="chart-wrap">
              {/* Cada cifra abre el detalle con su propio rango: si "Hoy" abriera
                  el rango por defecto, mostraría un número distinto al pulsado.
                  Y van a ganancias, no a ventas: estas cifras son ingreso
                  reconocido (contado + abonos), el mismo criterio que ganancias.
                  El detalle de ventas suma lo facturado y daría otro número. */}
              <HeroStats stats={[
                {
                  label: 'Histórico', value: q(d.ventas.total),
                  delta: ventas14 ? `${fmtN(ventas14.total_ventas)} ventas en los últimos 14 días` : undefined,
                  to: detalle('ganancias', { desde: '2000-01-01', hasta: hastaTend }),
                },
                // Promedio histórico por venta: el recorte que lo explica son las
                // ventas de mayor a menor monto
                { label: 'Promedio / venta', value: q(d.ventas.promedio_diario), to: detalle('ventas', { desde: '2000-01-01', hasta: hastaTend, sort: 'total_desc' }) },
                { label: 'Mes actual', value: q(d.ventas.mes), to: detalle('ganancias', {}, 'mes') },
                {
                  label: 'Hoy', value: q(d.ventas.hoy), tone: d.ventas.hoy > 0 ? 'pos' : undefined,
                  to: detalle('ganancias', {}, 'hoy'),
                },
              ]}>
                <LeyendaTendencia />
              </HeroStats>
              {/* La curva es el elemento más grande del resumen; sin enlace era
                  el único dato de la pantalla del que no se podía salir. */}
              {tendencia.puntos.length > 1 && (
                <Link className="grafica-enlace" to={detalle('ganancias', { desde: desdeTend, hasta: hastaTend })}
                  title="Ver el detalle de estos 14 días">
                  <AreaChart data={tendencia.puntos} height={200} />
                </Link>
              )}
            </div>
          </Hero>

          <div className="insight-row">
            <Insight icon={ShoppingCart} tone={d.ventas.hoy > 0 ? 'pos' : 'info'}
              title={`${q(d.ventas.hoy)} vendido hoy`} sub={`${q(d.ventas.semana)} acumulado en la semana`}
              to={detalle('ganancias', {}, 'hoy')} />
            <Insight icon={AlertTriangle} tone={d.productos.stock_bajo > 0 ? 'warn' : 'pos'}
              title={d.productos.stock_bajo > 0 ? `${fmtN(d.productos.stock_bajo)} productos con stock bajo` : 'Inventario sin alertas'}
              sub={d.productos.agotados > 0 ? `${fmtN(d.productos.agotados)} agotados requieren reabastecimiento` : 'Ningún producto agotado'}
              to={detalle('inventario', d.productos.stock_bajo > 0 ? { estado_stock: 'riesgo' } : {})} />
            <Insight icon={Users} tone="info" title={`${tasaClientes}% de clientes activos`}
              sub={`${fmtN(d.clientes.activos)} de ${fmtN(d.clientes.total)} registrados`}
              to={detalle('clientes', { estado: 'activo' }, 'mes')} />
          </div>

          <div className="row-12">
            <div className="card">
              <div className="card-header"><div className="card-title"><Users size={15} style={{ color: 'var(--accent-text)' }} />Clientes</div></div>
              <div className="card-pad" style={{ paddingBottom: 4 }}>
                <KpiGrid cols={2} items={[
                  { label: 'Total', value: d.clientes.total, icon: Users, tone: 'accent', to: detalle('clientes', {}, 'mes') },
                  { label: 'Activos', value: d.clientes.activos, icon: UserCheck, tone: 'pos', to: detalle('clientes', { estado: 'activo' }, 'mes') },
                  { label: 'Nuevos (mes)', value: d.clientes.nuevos_mes, icon: UserPlus, tone: 'info', to: detalle('clientes', { nuevos: '1' }, 'mes') },
                  // "Con ventas" del resumen es histórico, no del mes: el enlace
                  // abre todo el rango o mostraría muchos menos clientes
                  { label: 'Con ventas', value: d.clientes.con_ventas, icon: ShoppingBag, tone: 'violet', to: detalle('clientes', { con_compras: '1', desde: '2000-01-01', hasta: hastaTend }) },
                ]} />
              </div>
              {/* La tasa la componen los activos: es a ellos a donde lleva */}
              <Link className="progress-block es-enlace" to={detalle('clientes', { estado: 'activo' }, 'mes')}>
                <div className="progress-head"><span className="pl">Tasa de actividad</span><span className="pv tnum">{tasaClientes}%</span></div>
                <div className="progress"><span style={{ width: `${tasaClientes}%` }} /></div>
              </Link>
            </div>

            <div className="card">
              <div className="card-header"><div className="card-title"><Boxes size={15} style={{ color: 'var(--accent-text)' }} />Inventario</div></div>
              <div className="card-pad" style={{ paddingBottom: 4 }}>
                {/* El inventario no depende del rango: el detalle lo usa solo para
                    medir rotación, así que estos enlaces van sin fechas. */}
                <KpiGrid cols={2} items={[
                  { label: 'Productos', value: d.productos.total, icon: Package, tone: 'accent', to: detalle('inventario') },
                  // El KPI cuenta stock <= mínimo, agotados incluidos: ese es el
                  // estado "riesgo", no "bajo", que los excluye
                  { label: 'Stock bajo', value: d.productos.stock_bajo, icon: AlertTriangle, tone: 'warn', to: detalle('inventario', { estado_stock: 'riesgo' }) },
                  { label: 'Valor', value: q(d.productos.valor_inventario), icon: Wallet, tone: 'pos', to: detalle('inventario', { sort: 'valor_desc' }) },
                  { label: 'Agotados', value: d.productos.agotados, icon: Ban, tone: 'neg', to: detalle('inventario', { estado_stock: 'agotado' }) },
                ]} />
              </div>
              {/* Lo que baja la disponibilidad son los agotados: ese es el recorte
                  accionable, no el complementario de productos disponibles */}
              <Link className="progress-block es-enlace" to={detalle('inventario', { estado_stock: 'agotado' })}>
                <div className="progress-head"><span className="pl">Disponibilidad</span><span className="pv tnum">{disponibilidad}%</span></div>
                <div className="progress"><span style={{ width: `${disponibilidad}%` }} /></div>
              </Link>
            </div>
          </div>

          <Bloque titulo="Usuarios del sistema" icon={ShieldCheck} iconColor="var(--accent-text)">
            <div className="card-pad">
              <KpiGrid cols={2} items={[
                {
                  label: 'Total', value: d.usuarios.total, icon: Users, tone: 'accent',
                  to: detalle('vendedores', { incluir_sin_ventas: '1' }, 'mes'),
                },
                {
                  label: 'Activos', value: d.usuarios.activos, icon: UserCheck, tone: 'pos',
                  to: detalle('vendedores', { estado: 'activo', incluir_sin_ventas: '1' }, 'mes'),
                },
              ]} />
            </div>
          </Bloque>
        </div>
      )}
    </EstadoCarga>
  )
}

// ── Ventas ────────────────────────────────────────────────────────────────
export function TabVentas({ desde, hasta }: RangoProps) {
  const [metodo, setMetodo] = useState('todos')
  const [estado, setEstado] = useState('todos')
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['rep-ventas', desde, hasta, metodo, estado],
    queryFn: () => reportesApi.ventas({ ...base({ desde, hasta }), metodo_pago: limpio(metodo), estado: limpio(estado) }),
    placeholderData: keepPreviousData,
  })
  const r = data?.resumen
  const ventas = data?.ventas ?? []

  // Periodo anterior de la misma longitud, con los mismos filtros: es la base de
  // la curva punteada y del porcentaje de variación.
  const previo = rangoPrevio(desde, hasta)
  const { data: dataPrev } = useQuery({
    queryKey: ['rep-ventas', previo.desde, previo.hasta, metodo, estado],
    queryFn: () => reportesApi.ventas({ ...base(previo), metodo_pago: limpio(metodo), estado: limpio(estado) }),
    placeholderData: keepPreviousData,
  })

  const { slice, meta, page, setPage } = usePaginacionLocal(ventas, 12)
  const exportData: ReporteExportData | null = r ? {
    titulo: 'Reporte de ventas', rango: rangoTxt(desde, hasta),
    kpis: [
      { label: 'Transacciones', value: fmtN(r.total_ventas) }, { label: 'Monto total', value: q(r.monto_total) },
      { label: 'Promedio', value: q(r.promedio_venta ?? 0) }, { label: 'Venta máxima', value: q(r.venta_maxima ?? 0) },
    ],
    tablas: [{
      titulo: 'Detalle de ventas',
      columnas: [{ label: 'No.' }, { label: 'Fecha' }, { label: 'Cliente' }, { label: 'Método' }, { label: 'Estado' }, { label: 'Total', align: 'right' }],
      filas: ventas.map((v, i) => [i + 1, fmtFecha(v.created_at, true), v.cliente?.nombre ?? 'Consumidor final', METODO_LABEL[(v.metodo_pago ?? '') as keyof typeof METODO_LABEL] ?? v.metodo_pago ?? '—', ESTADO_VENTA[v.estado as keyof typeof ESTADO_VENTA]?.label ?? v.estado, q(v.total)]),
    }],
  } : null

  const tendencia = construirTendencia(desde, hasta, ventas, dataPrev?.ventas ?? [])
  const delta = variacion(tendencia.totalActual, tendencia.totalPrevio)
  const topClientes: RankItem[] = topPorNombre(ventas, (v) => v.cliente?.nombre ?? 'Consumidor final', (v) => Number(v.total))
    .map(([nombre, x]) => ({ name: nombre, sub: `${fmtN(x.veces)} ${x.veces === 1 ? 'compra' : 'compras'}`, value: q(x.total) }))

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div className="toolbar">
        <Select value={metodo} onValueChange={setMetodo} ariaLabel="Método"
          options={[{ value: 'todos', label: 'Todos los métodos' }, { value: 'efectivo', label: 'Efectivo' }, { value: 'tarjeta', label: 'Tarjeta' }, { value: 'transferencia', label: 'Transferencia' }, { value: 'mixto', label: 'Mixto' }, { value: 'credito', label: 'Crédito' }]} />
        <Select value={estado} onValueChange={setEstado} ariaLabel="Estado"
          options={[{ value: 'todos', label: 'Todos los estados' }, { value: 'completada', label: 'Completadas' }, { value: 'pendiente', label: 'Pendientes' }, { value: 'cancelada', label: 'Canceladas' }]} />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <BotonDetalle modulo="ventas" desde={desde} hasta={hasta} />
          <BotonesExportar data={exportData} />
        </div>
      </div>
      <EstadoCarga isLoading={isLoading} isError={isError} vacio={!r || r.total_ventas === 0} refetch={refetch}>
        {r && (
          <>
            <Hero titulo="Tendencia de ventas" badge={<BadgeVariacion valor={delta} />}>
              <div className="chart-wrap">
                <HeroStats stats={[
                  { label: 'Monto total', value: q(r.monto_total), tone: 'pos' },
                  { label: 'Transacciones', value: fmtN(r.total_ventas) },
                  { label: 'Promedio', value: q(r.promedio_venta ?? 0) },
                  { label: 'Venta máxima', value: q(r.venta_maxima ?? 0) },
                ]}>
                  <LeyendaTendencia />
                </HeroStats>
                {tendencia.puntos.length > 1 && <AreaChart data={tendencia.puntos} height={200} />}
              </div>
            </Hero>

            <div className="row-12">
              <DesgloseBarras titulo="Por método de pago" icon={CreditCard} data={r.por_metodo_pago}
                etiqueta={(k) => METODO_LABEL[k as keyof typeof METODO_LABEL] ?? k}
                tono={(k) => METODO_TONE[k as keyof typeof METODO_TONE]} />
              <Bloque titulo="Top clientes del periodo" icon={Trophy} iconColor="var(--warn)">
                <RankList items={topClientes} />
              </Bloque>
            </div>

            <Bloque titulo="Detalle de ventas" icon={Receipt} iconColor="var(--accent-text)">
              <table className="tbl">
                <thead><tr><th className="num" style={{ width: 48 }}>No.</th><th>Fecha</th><th>Cliente</th><th>Vendedor</th><th>Método</th><th>Estado</th><th className="num">Total</th></tr></thead>
                <tbody>
                  {slice.map((v, i) => (
                    <tr key={v.id}>
                      <td className="num muted tnum">{(meta.from ?? 1) + i}</td>
                      <td className="muted" style={{ fontSize: 12 }}>{fmtFecha(v.created_at, true)}</td>
                      <td>{v.cliente?.nombre ?? <span className="muted">Consumidor final</span>}</td>
                      <td className="muted">{v.vendedor ? `${v.vendedor.nombres} ${v.vendedor.apellidos}`.trim() : '—'}</td>
                      <td><span className="badge" data-tone={METODO_TONE[(v.metodo_pago ?? '') as keyof typeof METODO_TONE]}><span className="b-dot" />{METODO_LABEL[(v.metodo_pago ?? '') as keyof typeof METODO_LABEL] ?? v.metodo_pago ?? '—'}</span></td>
                      <td><span className="badge" data-tone={ESTADO_VENTA[v.estado as keyof typeof ESTADO_VENTA]?.tone}><span className="b-dot" />{ESTADO_VENTA[v.estado as keyof typeof ESTADO_VENTA]?.label ?? v.estado}</span></td>
                      <td className="num tnum" style={{ fontWeight: 600 }}>{q(v.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination meta={meta} page={page} setPage={setPage} />
            </Bloque>
          </>
        )}
      </EstadoCarga>
    </div>
  )
}

function SelectLimite({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange} ariaLabel="Límite"
      options={[{ value: '10', label: 'Top 10' }, { value: '20', label: 'Top 20' }, { value: '50', label: 'Top 50' }]} />
  )
}

// ── Productos ────────────────────────────────────────────────────────────────
export function TabProductos({ desde, hasta }: RangoProps) {
  const [limite, setLimite] = useState('20')
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['rep-productos', desde, hasta, limite], queryFn: () => reportesApi.productosMasVendidos({ ...base({ desde, hasta }), limite }), placeholderData: keepPreviousData,
  })
  const productos = data?.productos ?? []
  const { slice, meta, page, setPage } = usePaginacionLocal(productos, 15)
  const exportData: ReporteExportData | null = productos.length ? {
    titulo: 'Productos más vendidos', rango: rangoTxt(desde, hasta),
    tablas: [{ columnas: [{ label: 'No.' }, { label: 'Producto' }, { label: 'Unidades', align: 'right' }, { label: 'Veces', align: 'right' }, { label: 'Total vendido', align: 'right' }],
      filas: productos.map((p, i) => [i + 1, p.producto?.nombre ?? `#${p.producto_id}`, fmtN(p.total_unidades), fmtN(p.veces_vendido), q(p.total_vendido)]) }],
  } : null

  const nombreDe = (p: typeof productos[number]) => p.producto?.nombre ?? `#${p.producto_id}`
  const totalUnidades = productos.reduce((s, p) => s + Number(p.total_unidades || 0), 0)
  const totalVendido = productos.reduce((s, p) => s + Number(p.total_vendido || 0), 0)
  const maxTotal = Math.max(...productos.map((p) => Number(p.total_vendido || 0)), 0)
  const top5: RankItem[] = productos.slice(0, 5).map((p) => ({
    name: nombreDe(p), sub: `${p.producto?.sku ? p.producto.sku + ' · ' : ''}${fmtN(p.veces_vendido)} ventas`, value: q(p.total_vendido),
  }))

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div className="toolbar"><SelectLimite value={limite} onChange={setLimite} /><div style={{ marginLeft: "auto", display: "flex", gap: 8 }}><BotonDetalle modulo="productos" desde={desde} hasta={hasta} /><BotonesExportar data={exportData} /></div></div>
      <EstadoCarga isLoading={isLoading} isError={isError} vacio={productos.length === 0} refetch={refetch} icono={Package}>
        <div className="insight-row">
          <Insight icon={Package} tone="info" title={`${fmtN(productos.length)} productos vendidos`} sub={`${fmtN(totalUnidades)} unidades en el periodo`} />
          <Insight icon={Trophy} tone="pos" title={productos[0] ? `Top: ${nombreDe(productos[0])}` : 'Sin ventas'} sub={productos[0] ? `${q(productos[0].total_vendido)} en ventas` : undefined} />
          <Insight icon={Wallet} tone="warn" title={`${q(totalVendido)} total vendido`} sub="en productos este periodo" />
        </div>

        <div className="row-12">
          <Bloque titulo="Top 5 productos" icon={Trophy} iconColor="var(--warn)">
            <RankList items={top5} />
          </Bloque>
          <Bloque titulo="Ventas por producto" icon={Package} iconColor="var(--accent-text)">
            <div className="card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {productos.slice(0, 5).map((p) => (
                <BarRow key={p.producto_id} label={nombreDe(p)} valor={Number(p.total_vendido)} total={maxTotal} display={q(p.total_vendido)} />
              ))}
            </div>
          </Bloque>
        </div>

        <Bloque titulo="Productos más vendidos" icon={Package} iconColor="var(--accent-text)">
          <table className="tbl">
            <thead><tr><th className="num" style={{ width: 48 }}>No.</th><th>Producto</th><th className="num">Unidades</th><th className="num">Veces</th><th className="num">Total vendido</th></tr></thead>
            <tbody>
              {slice.map((p, i) => (
                <tr key={p.producto_id}>
                  <td className="num"><span className="rank" data-r={(meta.from ?? 1) + i}>{(meta.from ?? 1) + i}</span></td>
                  <td><div style={{ fontWeight: 500 }}>{nombreDe(p)}</div>{p.producto?.sku && <div className="muted" style={{ fontSize: 11.5 }}>{p.producto.sku}</div>}</td>
                  <td className="num tnum" style={{ fontWeight: 600 }}>{fmtN(p.total_unidades)}</td>
                  <td className="num tnum muted">{fmtN(p.veces_vendido)}</td>
                  <td className="num tnum">{q(p.total_vendido)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination meta={meta} page={page} setPage={setPage} />
        </Bloque>
      </EstadoCarga>
    </div>
  )
}

// ── Servicios ────────────────────────────────────────────────────────────────
export function TabServicios({ desde, hasta }: RangoProps) {
  const [limite, setLimite] = useState('20')
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['rep-servicios', desde, hasta, limite], queryFn: () => reportesApi.serviciosMasRealizados({ ...base({ desde, hasta }), limite }), placeholderData: keepPreviousData,
  })
  const servicios = data?.servicios ?? []
  const { slice, meta, page, setPage } = usePaginacionLocal(servicios, 15)
  const exportData: ReporteExportData | null = servicios.length ? {
    titulo: 'Servicios más realizados', rango: rangoTxt(desde, hasta),
    tablas: [{ columnas: [{ label: 'No.' }, { label: 'Servicio' }, { label: 'Realizados', align: 'right' }, { label: 'Veces', align: 'right' }, { label: 'Total facturado', align: 'right' }],
      filas: servicios.map((s, i) => [i + 1, s.servicio?.nombre ?? `#${s.servicio_id}`, fmtN(s.total_unidades), fmtN(s.veces_realizado), q(s.total_facturado)]) }],
  } : null

  const nombreDe = (s: typeof servicios[number]) => s.servicio?.nombre ?? `#${s.servicio_id}`
  const totalRealizados = servicios.reduce((acc, s) => acc + Number(s.total_unidades || 0), 0)
  const totalFacturado = servicios.reduce((acc, s) => acc + Number(s.total_facturado || 0), 0)
  const maxTotal = Math.max(...servicios.map((s) => Number(s.total_facturado || 0)), 0)
  const top5: RankItem[] = servicios.slice(0, 5).map((s) => ({
    name: nombreDe(s), sub: `${fmtN(s.total_unidades)} realizados · ${fmtN(s.veces_realizado)} veces`, value: q(s.total_facturado),
  }))

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div className="toolbar"><SelectLimite value={limite} onChange={setLimite} /><div style={{ marginLeft: "auto", display: "flex", gap: 8 }}><BotonDetalle modulo="servicios" desde={desde} hasta={hasta} /><BotonesExportar data={exportData} /></div></div>
      <EstadoCarga isLoading={isLoading} isError={isError} vacio={servicios.length === 0} refetch={refetch} icono={Boxes}>
        <div className="insight-row">
          <Insight icon={Boxes} tone="info" title={`${fmtN(servicios.length)} servicios distintos`} sub={`${fmtN(totalRealizados)} realizados en el periodo`} />
          <Insight icon={Trophy} tone="pos" title={servicios[0] ? `Top: ${nombreDe(servicios[0])}` : 'Sin servicios'} sub={servicios[0] ? `${fmtN(servicios[0].total_unidades)} realizados · ${q(servicios[0].total_facturado)}` : undefined} />
          <Insight icon={Wallet} tone="warn" title={`${q(totalFacturado)} facturado`} sub="en servicios este periodo" />
        </div>

        <div className="row-12">
          <Bloque titulo="Top 5 servicios" icon={Trophy} iconColor="var(--warn)">
            <RankList items={top5} />
          </Bloque>
          <Bloque titulo="Facturación por servicio" icon={Boxes} iconColor="var(--accent-text)">
            <div className="card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {servicios.slice(0, 5).map((s) => (
                <BarRow key={s.servicio_id} label={nombreDe(s)} valor={Number(s.total_facturado)} total={maxTotal} display={q(s.total_facturado)} />
              ))}
            </div>
          </Bloque>
        </div>

        <Bloque titulo="Servicios más realizados" icon={Boxes} iconColor="var(--accent-text)">
          <table className="tbl">
            <thead><tr><th className="num" style={{ width: 48 }}>No.</th><th>Servicio</th><th className="num">Realizados</th><th className="num">Veces</th><th className="num">Total facturado</th></tr></thead>
            <tbody>
              {slice.map((s, i) => (
                <tr key={s.servicio_id}>
                  <td className="num"><span className="rank" data-r={(meta.from ?? 1) + i}>{(meta.from ?? 1) + i}</span></td>
                  <td style={{ fontWeight: 500 }}>{nombreDe(s)}</td>
                  <td className="num tnum" style={{ fontWeight: 600 }}>{fmtN(s.total_unidades)}</td>
                  <td className="num tnum muted">{fmtN(s.veces_realizado)}</td>
                  <td className="num tnum">{q(s.total_facturado)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination meta={meta} page={page} setPage={setPage} />
        </Bloque>
      </EstadoCarga>
    </div>
  )
}

// ── Top clientes ──────────────────────────────────────────────────────────────
export function TabClientes({ desde, hasta }: RangoProps) {
  const [limite, setLimite] = useState('10')
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['rep-clientes', desde, hasta, limite], queryFn: () => reportesApi.topClientes({ ...base({ desde, hasta }), limite }), placeholderData: keepPreviousData,
  })
  const clientes = data?.clientes ?? []
  const { slice, meta, page, setPage } = usePaginacionLocal(clientes, 15)
  const exportData: ReporteExportData | null = clientes.length ? {
    titulo: 'Top clientes', rango: rangoTxt(desde, hasta),
    tablas: [{ columnas: [{ label: 'No.' }, { label: 'Cliente' }, { label: 'Compras', align: 'right' }, { label: 'Total comprado', align: 'right' }],
      filas: clientes.map((c, i) => [i + 1, c.nombre, fmtN(c.ventas_count), q(c.total_comprado ?? 0)]) }],
  } : null

  const totalComprado = clientes.reduce((s, c) => s + Number(c.total_comprado ?? 0), 0)
  const totalCompras = clientes.reduce((s, c) => s + Number(c.ventas_count || 0), 0)
  const maxTotal = Math.max(...clientes.map((c) => Number(c.total_comprado ?? 0)), 0)
  const ranking: RankItem[] = clientes.slice(0, 8).map((c) => ({
    name: c.nombre, sub: `${fmtN(c.ventas_count)} ${c.ventas_count === 1 ? 'compra' : 'compras'}`, value: q(c.total_comprado ?? 0),
  }))

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div className="toolbar"><SelectLimite value={limite} onChange={setLimite} /><div style={{ marginLeft: "auto", display: "flex", gap: 8 }}><BotonDetalle modulo="clientes" desde={desde} hasta={hasta} /><BotonesExportar data={exportData} /></div></div>
      <EstadoCarga isLoading={isLoading} isError={isError} vacio={clientes.length === 0} refetch={refetch} icono={Trophy}>
        <div className="insight-row">
          <Insight icon={Trophy} tone="pos" title={clientes[0] ? `Top: ${clientes[0].nombre}` : 'Sin clientes'} sub={clientes[0] ? `${q(clientes[0].total_comprado ?? 0)} comprado` : undefined} />
          <Insight icon={Users} tone="info" title={`${fmtN(clientes.length)} clientes destacados`} sub={`${fmtN(totalCompras)} compras en el periodo`} />
          <Insight icon={Wallet} tone="warn" title={`${q(totalComprado)} total`} sub="comprado por el top del periodo" />
        </div>

        <div className="row-12">
          <Bloque titulo="Ranking de clientes" icon={Trophy} iconColor="var(--warn)">
            <RankList items={ranking} />
          </Bloque>
          <Bloque titulo="Total comprado" icon={Users} iconColor="var(--accent-text)">
            <div className="card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {clientes.slice(0, 5).map((c) => (
                <BarRow key={c.id} label={c.nombre} valor={Number(c.total_comprado ?? 0)} total={maxTotal} display={q(c.total_comprado ?? 0)} />
              ))}
            </div>
          </Bloque>
        </div>

        <Bloque titulo="Clientes que más compran" icon={Trophy} iconColor="var(--warn)">
          <table className="tbl">
            <thead><tr><th className="num" style={{ width: 48 }}>No.</th><th>Cliente</th><th className="num">Compras</th><th className="num">Total comprado</th></tr></thead>
            <tbody>
              {slice.map((c, i) => (
                <tr key={c.id}>
                  <td className="num"><span className="rank" data-r={(meta.from ?? 1) + i}>{(meta.from ?? 1) + i}</span></td>
                  <td style={{ fontWeight: 500 }}>{c.nombre}</td>
                  <td className="num tnum muted">{fmtN(c.ventas_count)}</td>
                  <td className="num tnum" style={{ fontWeight: 600 }}>{q(c.total_comprado ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination meta={meta} page={page} setPage={setPage} />
        </Bloque>
      </EstadoCarga>
    </div>
  )
}

// ── Vendedores ──────────────────────────────────────────────────────────────
export function TabVendedores({ desde, hasta }: RangoProps) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['rep-vendedores', desde, hasta], queryFn: () => reportesApi.rendimientoVendedores(base({ desde, hasta })), placeholderData: keepPreviousData,
  })
  const vendedores = data?.vendedores ?? []
  const { slice, meta, page, setPage } = usePaginacionLocal(vendedores, 15)
  const totalVentas = vendedores.reduce((s, v) => s + Number(v.total_ventas || 0), 0)
  const totalTransacciones = vendedores.reduce((s, v) => s + Number(v.ventas_count || 0), 0)
  const maxTotal = Math.max(...vendedores.map((v) => Number(v.total_ventas || 0)), 0)
  const nombreDe = (v: typeof vendedores[number]) => `${v.nombres} ${v.apellidos}`.trim()
  const exportData: ReporteExportData | null = vendedores.length ? {
    titulo: 'Rendimiento de vendedores', rango: rangoTxt(desde, hasta),
    kpis: [{ label: 'Vendedores', value: fmtN(vendedores.length) }, { label: 'Ventas totales', value: q(totalVentas) }],
    tablas: [{ columnas: [{ label: 'No.' }, { label: 'Vendedor' }, { label: 'Rol' }, { label: 'Ventas', align: 'right' }, { label: 'Total', align: 'right' }],
      filas: vendedores.map((v, i) => [i + 1, nombreDe(v), v.rol, fmtN(v.ventas_count), q(v.total_ventas)]) }],
  } : null

  return (
    <EstadoCarga isLoading={isLoading} isError={isError} vacio={vendedores.length === 0} refetch={refetch} icono={Users}>
      <div style={{ display: 'grid', gap: 18 }}>
        <div className="rep-acciones" style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}><BotonDetalle modulo="vendedores" desde={desde} hasta={hasta} /><BotonesExportar data={exportData} /></div>

        <div className="insight-row">
          <Insight icon={Users} tone="info" title={`${fmtN(vendedores.length)} vendedores con ventas`} sub={`${fmtN(totalTransacciones)} transacciones en total`} />
          <Insight icon={Trophy} tone="pos" title={vendedores[0] ? `Top: ${nombreDe(vendedores[0])}` : 'Sin ventas'} sub={vendedores[0] ? `${q(vendedores[0].total_ventas)} vendido` : undefined} />
          <Insight icon={Coins} tone="warn" title={`${q(totalVentas)} ventas totales`} sub="en el periodo seleccionado" />
        </div>

        <Bloque titulo="Rendimiento por vendedor" icon={Trophy} iconColor="var(--warn)">
          <div className="card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {vendedores.map((v) => (
              <BarRow key={v.id} label={`${nombreDe(v)} · ${v.rol}`} valor={Number(v.total_ventas)} total={maxTotal} display={q(v.total_ventas)} />
            ))}
          </div>
        </Bloque>

        <Bloque titulo="Detalle" icon={Users} iconColor="var(--accent-text)">
          <table className="tbl">
            <thead><tr><th className="num" style={{ width: 48 }}>No.</th><th>Vendedor</th><th>Rol</th><th className="num">Ventas</th><th className="num">Total</th></tr></thead>
            <tbody>
              {slice.map((v, i) => (
                <tr key={v.id}>
                  <td className="num"><span className="rank" data-r={(meta.from ?? 1) + i}>{(meta.from ?? 1) + i}</span></td>
                  <td style={{ fontWeight: 500 }}>{nombreDe(v)}</td>
                  <td className="muted" style={{ textTransform: 'capitalize' }}>{v.rol}</td>
                  <td className="num tnum muted">{fmtN(v.ventas_count)}</td>
                  <td className="num tnum" style={{ fontWeight: 600 }}>{q(v.total_ventas)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination meta={meta} page={page} setPage={setPage} />
        </Bloque>
      </div>
    </EstadoCarga>
  )
}

// ── Sucursales ──────────────────────────────────────────────────────────────
export function TabSucursales({ desde, hasta }: RangoProps) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['rep-sucursales', desde, hasta], queryFn: () => reportesApi.sucursales(base({ desde, hasta })), placeholderData: keepPreviousData,
  })
  const sucursales = data?.sucursales ?? []
  const r = data?.resumen
  const { slice, meta, page, setPage } = usePaginacionLocal(sucursales, 15)
  const exportData: ReporteExportData | null = sucursales.length ? {
    titulo: 'Reporte por sucursales', rango: rangoTxt(desde, hasta),
    kpis: r ? [{ label: 'Sucursales', value: fmtN(r.total_sucursales) }, { label: 'Monto global', value: q(r.monto_total_global) }, { label: 'Transacciones', value: fmtN(r.transacciones_total) }, { label: 'Mejor sucursal', value: r.mejor_sucursal }] : undefined,
    tablas: [{ columnas: [{ label: 'No.' }, { label: 'Sucursal' }, { label: 'Compl.', align: 'right' }, { label: 'Pend.', align: 'right' }, { label: 'Canc.', align: 'right' }, { label: 'Promedio', align: 'right' }, { label: "Facturado", align: "right" }],
      filas: sucursales.map((s, i) => [i + 1, s.nombre, fmtN(s.ventas_completadas), fmtN(s.ventas_pendientes), fmtN(s.ventas_canceladas), q(s.promedio_venta), q(s.monto_total)]) }],
  } : null

  const maxTotal = Math.max(...sucursales.map((s) => Number(s.monto_total || 0)), 0)
  const pendientes = sucursales.reduce((s, x) => s + Number(x.ventas_pendientes || 0), 0)
  const ranking: RankItem[] = [...sucursales].sort((a, b) => Number(b.monto_total) - Number(a.monto_total)).slice(0, 8)
    .map((s) => ({ name: s.nombre, sub: `${fmtN(s.ventas_completadas)} completadas · ${fmtN(s.ventas_pendientes)} pendientes`, value: q(s.monto_total) }))

  return (
    <EstadoCarga isLoading={isLoading} isError={isError} vacio={sucursales.length === 0} refetch={refetch} icono={Building2}>
      <div style={{ display: 'grid', gap: 18 }}>
        <div className="rep-acciones" style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}><BotonDetalle modulo="sucursales" desde={desde} hasta={hasta} /><BotonesExportar data={exportData} /></div>

        {r && (
          <div className="insight-row">
            {/* "Facturado" y no "vendido": incluye crédito aún no cobrado. El
                detalle separa facturado, cobrado y cartera pendiente. */}
            <Insight icon={Building2} tone="info" title={`${fmtN(r.total_sucursales)} sucursales`} sub={`${fmtN(r.sucursales_activas)} activas · ${q(r.monto_total_global)} facturados`} />
            <Insight icon={Trophy} tone="pos" title={`Mejor: ${r.mejor_sucursal}`} sub={`${fmtN(r.transacciones_total)} transacciones en total`} />
            <Insight icon={AlertTriangle} tone={pendientes > 0 ? 'warn' : 'pos'} title={`${fmtN(pendientes)} ventas pendientes`} sub="entre todas las sucursales" />
          </div>
        )}

        <Bloque titulo="Distribución de ventas" icon={Building2} iconColor="var(--accent-text)">
          <div className="card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {sucursales.map((s) => (
              <BarRow key={s.id} label={s.nombre} valor={Number(s.monto_total)} total={maxTotal} display={q(s.monto_total)} />
            ))}
          </div>
        </Bloque>

        <div className="row-12">
          <Bloque titulo="Ranking de sucursales" icon={Trophy} iconColor="var(--warn)">
            <RankList items={ranking} />
          </Bloque>
          <Bloque titulo="Estado de ventas" icon={Receipt} iconColor="var(--accent-text)">
            <div className="card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sucursales.map((s, i) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '8px 0', borderBottom: i < sucursales.length - 1 ? '1px solid var(--border-soft)' : 'none' }}>
                  <span style={{ fontSize: 13, fontWeight: 500, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.nombre}</span>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <span className="badge" data-tone="pos" title="Completadas">{fmtN(s.ventas_completadas)}</span>
                    {s.ventas_pendientes > 0 && <span className="badge" data-tone="warn" title="Pendientes">{fmtN(s.ventas_pendientes)}</span>}
                    {s.ventas_canceladas > 0 && <span className="badge" data-tone="neg" title="Canceladas">{fmtN(s.ventas_canceladas)}</span>}
                  </div>
                </div>
              ))}
            </div>
          </Bloque>
        </div>

        <Bloque titulo="Ventas por sucursal" icon={Building2} iconColor="var(--accent-text)">
          <table className="tbl">
            <thead><tr><th className="num" style={{ width: 48 }}>No.</th><th>Sucursal</th><th className="num">Completadas</th><th className="num">Pendientes</th><th className="num">Canceladas</th><th className="num">Promedio</th><th className="num" title="Suma de las ventas completadas, incluidas las de crédito aún no cobradas. El detalle muestra además lo cobrado y la cartera pendiente.">Facturado</th></tr></thead>
            <tbody>
              {slice.map((s, i) => (
                <tr key={s.id}>
                  <td className="num muted tnum">{(meta.from ?? 1) + i}</td>
                  <td style={{ fontWeight: 600 }}>{s.nombre}</td>
                  <td className="num tnum">{fmtN(s.ventas_completadas)}</td>
                  <td className="num tnum muted">{fmtN(s.ventas_pendientes)}</td>
                  <td className="num tnum muted">{fmtN(s.ventas_canceladas)}</td>
                  <td className="num tnum">{q(s.promedio_venta)}</td>
                  <td className="num tnum" style={{ fontWeight: 600 }}>{q(s.monto_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination meta={meta} page={page} setPage={setPage} />
        </Bloque>
      </div>
    </EstadoCarga>
  )
}

// ── Inventario ──────────────────────────────────────────────────────────────
export function TabInventario() {
  const [estadoStock, setEstadoStock] = useState('todos')
  const [categoria, setCategoria] = useState('todos')
  const { data: cats = [] } = useQuery({ queryKey: ['categorias-opciones'], queryFn: catalogosApi.categorias, staleTime: 1000 * 60 * 10 })
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['rep-inventario', estadoStock, categoria],
    queryFn: () => reportesApi.inventario({ estado_stock: estadoStock, categoria_id: limpio(categoria) }),
    placeholderData: keepPreviousData,
  })
  const r = data?.resumen
  const productos = data?.productos ?? []
  const { slice, meta, page, setPage } = usePaginacionLocal(productos, 15)
  const exportData: ReporteExportData | null = r ? {
    titulo: 'Reporte de inventario',
    kpis: [{ label: 'Productos', value: fmtN(r.total_productos) }, { label: 'Valor compra', value: q(r.valor_total_inventario) }, { label: 'Valor venta', value: q(r.valor_venta_total) }, { label: 'Stock bajo', value: fmtN(r.productos_bajo_stock) }, { label: 'Agotados', value: fmtN(r.productos_agotados) }],
    tablas: [{ columnas: [{ label: 'No.' }, { label: 'Producto' }, { label: 'SKU' }, { label: 'Marca' }, { label: 'Stock', align: 'right' }, { label: 'P. compra', align: 'right' }, { label: 'P. venta', align: 'right' }],
      filas: productos.map((p, i) => [i + 1, p.nombre, p.sku, p.marca ?? '—', fmtN(p.stock), q(p.precio_compra), q(p.precio_venta)]) }],
  } : null

  const margenPotencial = r ? r.valor_venta_total - r.valor_total_inventario : 0
  // Margen sobre el valor de venta: qué porcentaje del ingreso potencial es ganancia.
  const margenPct = r && r.valor_venta_total > 0 ? (margenPotencial / r.valor_venta_total) * 100 : 0
  const sanos = r ? Math.max(0, r.total_productos - r.productos_bajo_stock - r.productos_agotados) : 0
  const valorStock = (p: typeof productos[number]) => Number(p.stock) * Number(p.precio_venta)
  const topValor: RankItem[] = [...productos].sort((a, b) => valorStock(b) - valorStock(a)).slice(0, 5)
    .map((p) => ({ name: p.nombre, sub: `${fmtN(p.stock)} unid. en stock`, value: q(valorStock(p)) }))
  const reabastecer: RankItem[] = productos.filter((p) => p.stock <= p.stock_minimo)
    .sort((a, b) => a.stock - b.stock).slice(0, 5)
    .map((p) => ({ name: p.nombre, sub: p.sku, value: p.stock <= 0 ? 'Agotado' : `${fmtN(p.stock)} unid.` }))

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div className="toolbar">
        <Select value={estadoStock} onValueChange={setEstadoStock} ariaLabel="Estado de stock"
          options={[{ value: 'todos', label: 'Todo el inventario' }, { value: 'normal', label: 'Stock normal' }, { value: 'bajo', label: 'Stock bajo' }, { value: 'agotado', label: 'Agotados' }]} />
        <Select value={categoria} onValueChange={setCategoria} ariaLabel="Categoría"
          options={[{ value: 'todos', label: 'Todas las categorías' }, ...cats.map((c) => ({ value: String(c.id), label: '— '.repeat(c.nivel) + c.nombre }))]} />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {/* Sin fechas: el detalle elige su propio rango para medir el movimiento */}
          <BotonDetalle modulo="inventario" />
          <BotonesExportar data={exportData} />
        </div>
      </div>
      <EstadoCarga isLoading={isLoading} isError={isError} vacio={!r} refetch={refetch} icono={Package}>
        {r && (
          <>
            <div className="insight-row">
              <Insight icon={Ban} tone={r.productos_agotados > 0 ? 'neg' : 'pos'}
                title={`${fmtN(r.productos_agotados)} productos agotados`} sub="requieren reabastecimiento urgente" />
              <Insight icon={AlertTriangle} tone={r.productos_bajo_stock > 0 ? 'warn' : 'pos'}
                title={`${fmtN(r.productos_bajo_stock)} con stock bajo`} sub="riesgo de quedar sin inventario" />
              <Insight icon={Wallet} tone="pos" title={`${q(margenPotencial)} margen potencial`} sub={`${pct(margenPct)} sobre el valor de venta del stock`} />
            </div>

            <Hero titulo="Salud del inventario"
              badge={<span className="badge" data-tone={margenPct >= 30 ? 'pos' : margenPct >= 15 ? 'warn' : 'neg'}><span className="b-dot" />Margen {pct(margenPct)}</span>}>
              <div className="chart-wrap" style={{ paddingBottom: 8 }}>
                <HeroStats stats={[
                  { label: 'Valor de compra', value: q(r.valor_total_inventario) },
                  { label: 'Valor de venta', value: q(r.valor_venta_total) },
                  { label: 'Margen potencial', value: q(margenPotencial), tone: 'pos' },
                  { label: 'Margen', value: pct(margenPct), tone: 'pos' },
                ]} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <BarRow label={`Stock saludable · ${fmtN(sanos)} productos`} valor={sanos} total={r.total_productos} display={fmtN(sanos)} color="var(--pos)" />
                  <BarRow label={`Stock bajo · ${fmtN(r.productos_bajo_stock)} productos`} valor={r.productos_bajo_stock} total={r.total_productos} display={fmtN(r.productos_bajo_stock)} color="var(--warn)" />
                  <BarRow label={`Agotados · ${fmtN(r.productos_agotados)} productos`} valor={r.productos_agotados} total={r.total_productos} display={fmtN(r.productos_agotados)} color="var(--neg)" />
                </div>
              </div>
            </Hero>

            <div className="row-12">
              <Bloque titulo="Mayor valor en stock" icon={Trophy} iconColor="var(--warn)">
                <RankList items={topValor} />
              </Bloque>
              <Bloque titulo="Reabastecer pronto" icon={AlertTriangle} iconColor="var(--warn)">
                <RankList items={reabastecer} />
              </Bloque>
            </div>

            <Bloque titulo="Productos" icon={Package} iconColor="var(--accent-text)">
              <table className="tbl">
                <thead><tr><th className="num" style={{ width: 48 }}>No.</th><th>Producto</th><th>Marca</th><th className="num">Stock</th><th className="num">P. compra</th><th className="num">P. venta</th><th className="num">Valor stock</th></tr></thead>
                <tbody>
                  {slice.map((p, i) => {
                    const tono = p.stock <= 0 ? 'neg' : p.stock <= p.stock_minimo ? 'warn' : 'pos'
                    return (
                      <tr key={p.id}>
                        <td className="num muted tnum">{(meta.from ?? 1) + i}</td>
                        <td><div style={{ fontWeight: 500 }}>{p.nombre}</div><div className="muted" style={{ fontSize: 11.5 }}>{p.sku}</div></td>
                        <td className="muted">{p.marca ?? '—'}</td>
                        <td className="num"><span className="badge" data-tone={tono}><span className="b-dot" />{p.stock}</span></td>
                        <td className="num tnum muted">{q(p.precio_compra)}</td>
                        <td className="num tnum">{q(p.precio_venta)}</td>
                        <td className="num tnum" style={{ fontWeight: 600 }}>{q(valorStock(p))}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <Pagination meta={meta} page={page} setPage={setPage} />
            </Bloque>
          </>
        )}
      </EstadoCarga>
    </div>
  )
}

// ── Ganancias ───────────────────────────────────────────────────────────────
export function TabGanancias({ desde, hasta }: RangoProps) {
  const [tipo, setTipo] = useState('todos')
  const [sucursal, setSucursal] = useState('todos')
  const [vendedor, setVendedor] = useState('todos')
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['rep-ganancias', desde, hasta, tipo, sucursal, vendedor],
    queryFn: () => reportesApi.ganancias({ ...base({ desde, hasta }), tipo: limpio(tipo), sucursal_id: limpio(sucursal), vendedor_id: limpio(vendedor) }),
    placeholderData: keepPreviousData,
  })
  const r = data?.resumen
  const items = data?.items ?? []
  const porTipo = data?.por_tipo
  const cat = data?.catalogos
  const { slice, meta, page, setPage } = usePaginacionLocal(items, 12)
  const exportData: ReporteExportData | null = r ? {
    titulo: 'Reporte de ganancias', rango: rangoTxt(desde, hasta),
    kpis: [{ label: 'Ingresos', value: q(r.ingresos_totales) }, { label: 'Costos', value: q(r.costos_totales) }, { label: 'Ganancia neta', value: q(r.ganancia_neta) }, { label: 'Margen', value: pct(r.margen_porcentaje) }, { label: 'Items', value: fmtN(r.items_vendidos) }],
    tablas: [{ titulo: 'Ganancia por item', columnas: [{ label: 'No.' }, { label: 'Item' }, { label: 'Tipo' }, { label: 'Unid. cobradas', align: 'right' }, { label: 'Ingresos', align: 'right' }, { label: 'Costo', align: 'right' }, { label: 'Ganancia', align: 'right' }, { label: 'Margen', align: 'right' }],
      filas: items.map((it, i) => [i + 1, it.nombre, it.tipo, fmtN(it.unidades), q(it.ingresos), q(it.costo_total), q(it.ganancia), pct(it.margen)]) }],
  } : null

  const margen = Math.max(0, Math.min(100, Math.round(Number(r?.margen_porcentaje ?? 0))))
  const gruposTipo = Object.entries(porTipo ?? {})
  const totalGanancia = gruposTipo.reduce((s, [, v]) => s + Number(v.ganancia || 0), 0)
  const topRentables: RankItem[] = [...items].sort((a, b) => Number(b.ganancia) - Number(a.ganancia)).slice(0, 5)
    .map((g) => ({ name: g.nombre, sub: `${fmtN(g.unidades)} unid. · margen ${pct(g.margen)}`, value: q(g.ganancia) }))

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div className="toolbar">
        <Select value={tipo} onValueChange={setTipo} ariaLabel="Tipo"
          options={[{ value: 'todos', label: 'Productos y servicios' }, { value: 'producto', label: 'Solo productos' }, { value: 'servicio', label: 'Solo servicios' }]} />
        <Select value={sucursal} onValueChange={setSucursal} ariaLabel="Sucursal"
          options={[{ value: 'todos', label: 'Todas las sucursales' }, ...(cat?.sucursales ?? []).map((s) => ({ value: String(s.id), label: s.nombre }))]} />
        <Select value={vendedor} onValueChange={setVendedor} ariaLabel="Vendedor"
          options={[{ value: 'todos', label: 'Todos los vendedores' }, ...(cat?.vendedores ?? []).map((v) => ({ value: String(v.id), label: v.nombre }))]} />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <BotonDetalle modulo="ganancias" desde={desde} hasta={hasta} />
          <BotonesExportar data={exportData} />
        </div>
      </div>
      <EstadoCarga isLoading={isLoading} isError={isError} vacio={!r || items.length === 0} refetch={refetch} icono={CircleDollarSign}>
        {r && (
          <>
            <Hero titulo="Rentabilidad del periodo"
              badge={<span className="badge" data-tone={margen >= 30 ? 'pos' : margen >= 15 ? 'warn' : 'neg'}><span className="b-dot" />Margen {pct(r.margen_porcentaje)}</span>}>
              <div className="chart-wrap">
                <HeroStats stats={[
                  { label: 'Ingresos', value: q(r.ingresos_totales) },
                  { label: 'Costos', value: q(r.costos_totales) },
                  { label: 'Ganancia neta', value: q(r.ganancia_neta), tone: r.ganancia_neta >= 0 ? 'pos' : 'neg' },
                  { label: 'Items vendidos', value: fmtN(r.items_vendidos) },
                ]} />
                <div className="barrow-track" style={{ height: 12 }}>
                  <span style={{ width: `${margen}%`, background: 'var(--pos)' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--text-faint)', marginTop: 6 }}>
                  <span>Ganancia {margen}%</span><span>Costos {100 - margen}%</span>
                </div>
              </div>
            </Hero>

            <div className="row-12">
              <Bloque titulo="Productos vs. Servicios" icon={Layers} iconColor="var(--accent-text)">
                <div className="card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {gruposTipo.map(([t, v], i) => (
                    <BarRow key={t} label={`${t.charAt(0).toUpperCase() + t.slice(1)} · ${fmtN(v.unidades)} unid.`}
                      valor={Number(v.ganancia)} total={totalGanancia} display={q(v.ganancia)}
                      color={i === 0 ? 'var(--info)' : 'var(--accent)'} />
                  ))}
                </div>
              </Bloque>
              <Bloque titulo="Top 5 más rentables" icon={Trophy} iconColor="var(--warn)">
                <RankList items={topRentables} />
              </Bloque>
            </div>

            {porTipo && (
              <div className="gan-tipos">
                {gruposTipo.map(([t, v]) => (
                  <div key={t} className="card gan-tipo">
                    <div className="gan-tipo-head" style={{ textTransform: 'capitalize' }}>{t}</div>
                    <div className="gan-tipo-row"><span className="muted">Ingresos</span><span className="tnum">{q(v.ingresos)}</span></div>
                    <div className="gan-tipo-row"><span className="muted">Costos</span><span className="tnum">{q(v.costos)}</span></div>
                    <div className="gan-tipo-row" style={{ fontWeight: 700, color: 'var(--pos)' }}><span>Ganancia</span><span className="tnum">{q(v.ganancia)}</span></div>
                    <div className="muted" style={{ fontSize: 11.5 }} title="Unidades según lo cobrado: completas en contado, proporcionales al % pagado en crédito">{fmtN(v.unidades)} unid. cobradas</div>
                  </div>
                ))}
              </div>
            )}

            <Bloque titulo="Ganancia por item" icon={Wallet} iconColor="var(--accent-text)">
              <table className="tbl">
                <thead><tr><th className="num" style={{ width: 48 }}>No.</th><th>Item</th><th>Tipo</th><th className="num" title="Unidades según lo cobrado: completas en contado, proporcionales al % pagado en crédito">Unid. cobradas</th><th className="num">Ingresos</th><th className="num">Costo</th><th className="num">Ganancia</th><th className="num">Margen</th></tr></thead>
                <tbody>
                  {slice.map((it, i) => (
                    <tr key={i}>
                      <td className="num muted tnum">{(meta.from ?? 1) + i}</td>
                      <td style={{ fontWeight: 500 }}>
                        {/* De lo agregado al detalle: abre los eventos de este item */}
                        {it.producto_id || it.servicio_id ? (
                          <Link to={enlaceItem(it, desde, hasta)} title={`Ver los ingresos de ${it.nombre}`}>{it.nombre}</Link>
                        ) : it.nombre}
                        {!it.tiene_costo && <span className="muted" title="Sin costo registrado"> ⚠</span>}
                      </td>
                      <td className="muted" style={{ textTransform: 'capitalize' }}>{it.tipo}</td>
                      <td className="num tnum">{fmtN(it.unidades)}</td>
                      <td className="num tnum">{q(it.ingresos)}</td>
                      <td className="num tnum muted">{q(it.costo_total)}</td>
                      <td className="num tnum" style={{ fontWeight: 600, color: 'var(--pos)' }}>{q(it.ganancia)}</td>
                      <td className="num tnum">{pct(it.margen)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination meta={meta} page={page} setPage={setPage} />
            </Bloque>
          </>
        )}
      </EstadoCarga>
    </div>
  )
}

// ── Tienda (pedidos en línea) ───────────────────────────────────────────────
const TONO_ESTADO_PEDIDO: Record<string, Tono> = {
  entregado: 'pos', completado: 'pos', confirmado: 'info', enviado: 'info',
  pendiente: 'warn', procesando: 'warn', cancelado: 'neg',
}

export function TabTienda({ desde, hasta }: RangoProps) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['rep-tienda', desde, hasta], queryFn: () => reportesApi.tiendaPedidos(base({ desde, hasta })), placeholderData: keepPreviousData,
  })
  const r = data?.resumen
  const pedidos = data?.pedidos ?? []
  const { slice, meta, page, setPage } = usePaginacionLocal(pedidos, 12)
  const exportData: ReporteExportData | null = r ? {
    titulo: 'Reporte de tienda', rango: rangoTxt(desde, hasta),
    kpis: [{ label: 'Pedidos', value: fmtN(r.total_pedidos) }, { label: 'Monto total', value: q(r.monto_total) }, { label: 'Promedio', value: q(r.promedio) }, { label: 'Pedido máximo', value: q(r.pedido_maximo) }],
    tablas: [{ titulo: 'Pedidos', columnas: [{ label: 'No.' }, { label: 'N° Pedido' }, { label: 'Fecha' }, { label: 'Cliente' }, { label: 'Estado' }, { label: 'Total', align: 'right' }],
      filas: pedidos.map((p, i) => [i + 1, p.numero_pedido, fmtFecha(p.created_at, true), p.cuenta ? `${p.cuenta.nombre} ${p.cuenta.apellido}`.trim() : '—', p.estado, q(p.total)]) }],
  } : null

  const serie = serieDiaria(pedidos, (p) => p.created_at, (p) => Number(p.total))
  const pendientes = pedidos.filter((p) => p.estado === 'pendiente').length

  return (
    <EstadoCarga isLoading={isLoading} isError={isError} vacio={!r || r.total_pedidos === 0} refetch={refetch} icono={Store}>
      {r && (
        <div style={{ display: 'grid', gap: 18 }}>
          <div className="rep-acciones" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <BotonDetalle modulo="tienda" desde={desde} hasta={hasta} />
            <BotonesExportar data={exportData} />
          </div>

          <div className="insight-row">
            <Insight icon={Store} tone="info" title={`${fmtN(r.total_pedidos)} pedidos registrados`} sub={`${q(r.monto_total)} en ventas de tienda`} />
            <Insight icon={TrendingUp} tone="pos" title={`${q(r.promedio)} promedio`} sub={`Pedido máximo: ${q(r.pedido_maximo)}`} />
            <Insight icon={Clock} tone={pendientes > 0 ? 'warn' : 'pos'} title={`${fmtN(pendientes)} pedidos pendientes`} sub="por confirmar o entregar" />
          </div>

          <Hero titulo="Pedidos del periodo"
            badge={<span className="badge" data-tone="accent">{fmtN(serie.length)} {serie.length === 1 ? 'día' : 'días'} con pedidos</span>}>
            <div className="chart-wrap">
              <HeroStats stats={[
                { label: 'Monto total', value: q(r.monto_total), tone: 'pos' },
                { label: 'Pedidos', value: fmtN(r.total_pedidos) },
                { label: 'Promedio', value: q(r.promedio) },
                { label: 'Pedido máximo', value: q(r.pedido_maximo) },
              ]} />
              {serie.length > 1 && <Sparkline data={serie} height={90} />}
            </div>
          </Hero>

          <div className="row-12">
            <DesgloseBarras titulo="Por estado" icon={ClipboardList} data={r.por_estado}
              etiqueta={(k) => k.charAt(0).toUpperCase() + k.slice(1)} tono={(k) => TONO_ESTADO_PEDIDO[k]} />
            <DesgloseBarras titulo="Por método de pago" icon={CreditCard} data={r.por_metodo_pago}
              etiqueta={(k) => METODO_LABEL[k as keyof typeof METODO_LABEL] ?? (k || 'N/D')}
              tono={(k) => METODO_TONE[k as keyof typeof METODO_TONE]} />
          </div>

          <Bloque titulo="Pedidos" icon={Store} iconColor="var(--accent-text)">
            <table className="tbl">
              <thead><tr><th className="num" style={{ width: 48 }}>No.</th><th>N° Pedido</th><th>Fecha</th><th>Cliente</th><th>Estado</th><th className="num">Total</th></tr></thead>
              <tbody>
                {slice.map((p, i) => (
                  <tr key={p.id}>
                    <td className="num muted tnum">{(meta.from ?? 1) + i}</td>
                    <td style={{ fontWeight: 600, fontSize: 12 }}>{p.numero_pedido}</td>
                    <td className="muted" style={{ fontSize: 12 }}>{fmtFecha(p.created_at, true)}</td>
                    <td>{p.cuenta ? `${p.cuenta.nombre} ${p.cuenta.apellido}`.trim() : <span className="muted">—</span>}</td>
                    <td><span className="badge" data-tone={TONO_ESTADO_PEDIDO[p.estado]} style={{ textTransform: 'capitalize' }}><span className="b-dot" />{p.estado}</span></td>
                    <td className="num tnum" style={{ fontWeight: 600 }}>{q(p.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination meta={meta} page={page} setPage={setPage} />
          </Bloque>
        </div>
      )}
    </EstadoCarga>
  )
}
