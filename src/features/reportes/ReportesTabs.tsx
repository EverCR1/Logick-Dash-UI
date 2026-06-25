import { useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import {
  ShoppingCart, Coins, TrendingUp, ArrowUpRight, Users, UserCheck, UserPlus, ShoppingBag,
  Package, AlertTriangle, XCircle, Wallet, Boxes, Building2, Trophy, Percent, Receipt,
  Store, ClipboardList, CircleDollarSign, Layers,
} from 'lucide-react'
import { Donut } from '@/components/charts'
import { Select } from '@/components/ui/Select'
import { Pagination } from '@/components/ui/Pagination'
import { reportesApi, catalogosApi } from '@/lib/api'
import { usePaginacionLocal } from '@/lib/hooks'
import { q, fmtN, pct, fmtFecha } from '@/lib/format'
import { ESTADO_VENTA, METODO_LABEL, METODO_TONE } from '../ventas/venta-estados'
import { EstadoCarga, KpiStrip, PALETA } from './reportes-utils'
import { BotonesExportar } from './BotonesExportar'
import type { ReporteExportData } from './ReportePDF'

interface RangoProps { desde: string; hasta: string }
const base = ({ desde, hasta }: RangoProps) => ({ fecha_inicio: desde, fecha_fin: hasta })
const limpio = (v: string) => (v && v !== 'todos' ? v : undefined)
const rangoTxt = (desde: string, hasta: string) => `Del ${fmtFecha(desde)} al ${fmtFecha(hasta)}`

function Bloque({ titulo, icon: Icon, children, action }: { titulo: string; icon?: React.ComponentType<{ size?: number }>; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="card">
      <div className="card-header" style={{ justifyContent: 'space-between' }}>
        <div className="card-title">{Icon && <Icon size={15} />}{titulo}</div>
        {action}
      </div>
      {children}
    </div>
  )
}

function Desglose({ titulo, data }: { titulo: string; data: Record<string, { cantidad: number; total: number }> }) {
  const entradas = Object.entries(data ?? {})
  if (entradas.length === 0) return null
  const segmentos = entradas.map(([k, v], i) => ({ label: k || 'N/D', value: v.total, color: PALETA[i % PALETA.length] }))
  return (
    <Bloque titulo={titulo}>
      <div className="donut-row" style={{ padding: 16 }}>
        <div className="donut-wrap"><Donut segments={segmentos} /></div>
        <div style={{ display: 'grid', gap: 8, flex: 1, minWidth: 200 }}>
          {entradas.map(([k, v], i) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: PALETA[i % PALETA.length], flexShrink: 0 }} />
              <span style={{ textTransform: 'capitalize' }}>{k || 'No definido'}</span>
              <span className="muted">· {v.cantidad}</span>
              <span style={{ marginLeft: 'auto', fontWeight: 600 }} className="tnum">{q(v.total)}</span>
            </div>
          ))}
        </div>
      </div>
    </Bloque>
  )
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div className="rep-seccion">{titulo}</div>
      {children}
    </div>
  )
}

// ── Resumen general ───────────────────────────────────────────────────────
export function TabResumen() {
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['rep-resumen'], queryFn: reportesApi.resumen })
  const d = data?.data
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
  return (
    <EstadoCarga isLoading={isLoading} isError={isError} vacio={!d} refetch={refetch}>
      {d && (
        <div style={{ display: 'grid', gap: 20 }}>
          <div className="rep-acciones"><BotonesExportar data={exportData} /></div>
          <Seccion titulo="Ventas">
            <KpiStrip items={[
              { label: 'Hoy', value: q(d.ventas.hoy), icon: ShoppingCart, tone: 'pos', sub: 'completadas' },
              { label: 'Semana', value: q(d.ventas.semana), icon: TrendingUp, tone: 'accent' },
              { label: 'Mes', value: q(d.ventas.mes), icon: Coins, tone: 'info' },
              { label: 'Histórico', value: q(d.ventas.total), icon: Trophy, tone: 'violet' },
              { label: 'Promedio/venta', value: q(d.ventas.promedio_diario), icon: ArrowUpRight, tone: 'warn' },
            ]} />
          </Seccion>
          <Seccion titulo="Clientes">
            <KpiStrip items={[
              { label: 'Total', value: d.clientes.total, icon: Users, tone: 'accent' },
              { label: 'Activos', value: d.clientes.activos, icon: UserCheck, tone: 'pos' },
              { label: 'Nuevos (mes)', value: d.clientes.nuevos_mes, icon: UserPlus, tone: 'info' },
              { label: 'Con ventas', value: d.clientes.con_ventas, icon: ShoppingBag, tone: 'violet' },
            ]} />
          </Seccion>
          <Seccion titulo="Inventario">
            <KpiStrip items={[
              { label: 'Productos', value: d.productos.total, icon: Package, tone: 'accent' },
              { label: 'Stock bajo', value: d.productos.stock_bajo, icon: AlertTriangle, tone: 'warn' },
              { label: 'Agotados', value: d.productos.agotados, icon: XCircle, tone: 'neg' },
              { label: 'Valor inventario', value: q(d.productos.valor_inventario), icon: Wallet, tone: 'info' },
            ]} />
          </Seccion>
          <Seccion titulo="Usuarios">
            <KpiStrip items={[
              { label: 'Total', value: d.usuarios.total, icon: Users, tone: 'accent' },
              { label: 'Activos', value: d.usuarios.activos, icon: UserCheck, tone: 'pos' },
            ]} />
          </Seccion>
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
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="toolbar">
        <Select value={metodo} onValueChange={setMetodo} ariaLabel="Método"
          options={[{ value: 'todos', label: 'Todos los métodos' }, { value: 'efectivo', label: 'Efectivo' }, { value: 'tarjeta', label: 'Tarjeta' }, { value: 'transferencia', label: 'Transferencia' }, { value: 'mixto', label: 'Mixto' }, { value: 'credito', label: 'Crédito' }]} />
        <Select value={estado} onValueChange={setEstado} ariaLabel="Estado"
          options={[{ value: 'todos', label: 'Todos los estados' }, { value: 'completada', label: 'Completadas' }, { value: 'pendiente', label: 'Pendientes' }, { value: 'cancelada', label: 'Canceladas' }]} />
        <div style={{ marginLeft: 'auto' }}><BotonesExportar data={exportData} /></div>
      </div>
      <EstadoCarga isLoading={isLoading} isError={isError} vacio={!r || r.total_ventas === 0} refetch={refetch}>
        {r && (
          <>
            <KpiStrip items={[
              { label: 'Transacciones', value: r.total_ventas, icon: Receipt, tone: 'accent' },
              { label: 'Monto total', value: q(r.monto_total), icon: Coins, tone: 'pos' },
              { label: 'Promedio', value: q(r.promedio_venta ?? 0), icon: TrendingUp, tone: 'info' },
              { label: 'Venta máxima', value: q(r.venta_maxima ?? 0), icon: ArrowUpRight, tone: 'violet' },
            ]} />
            <Desglose titulo="Por método de pago" data={r.por_metodo_pago} />
            <Bloque titulo="Detalle de ventas" icon={Receipt}>
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
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="toolbar"><SelectLimite value={limite} onChange={setLimite} /><div style={{ marginLeft: 'auto' }}><BotonesExportar data={exportData} /></div></div>
      <EstadoCarga isLoading={isLoading} isError={isError} vacio={productos.length === 0} refetch={refetch} icono={Package}>
        <Bloque titulo="Productos más vendidos" icon={Package}>
          <table className="tbl">
            <thead><tr><th className="num" style={{ width: 48 }}>No.</th><th>Producto</th><th className="num">Unidades</th><th className="num">Veces</th><th className="num">Total vendido</th></tr></thead>
            <tbody>
              {slice.map((p, i) => (
                <tr key={p.producto_id}>
                  <td className="num muted tnum">{(meta.from ?? 1) + i}</td>
                  <td><div style={{ fontWeight: 500 }}>{p.producto?.nombre ?? `#${p.producto_id}`}</div>{p.producto?.sku && <div className="muted" style={{ fontSize: 11.5 }}>{p.producto.sku}</div>}</td>
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
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="toolbar"><SelectLimite value={limite} onChange={setLimite} /><div style={{ marginLeft: 'auto' }}><BotonesExportar data={exportData} /></div></div>
      <EstadoCarga isLoading={isLoading} isError={isError} vacio={servicios.length === 0} refetch={refetch} icono={Boxes}>
        <Bloque titulo="Servicios más realizados" icon={Boxes}>
          <table className="tbl">
            <thead><tr><th className="num" style={{ width: 48 }}>No.</th><th>Servicio</th><th className="num">Realizados</th><th className="num">Veces</th><th className="num">Total facturado</th></tr></thead>
            <tbody>
              {slice.map((s, i) => (
                <tr key={s.servicio_id}>
                  <td className="num muted tnum">{(meta.from ?? 1) + i}</td>
                  <td style={{ fontWeight: 500 }}>{s.servicio?.nombre ?? `#${s.servicio_id}`}</td>
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
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="toolbar"><SelectLimite value={limite} onChange={setLimite} /><div style={{ marginLeft: 'auto' }}><BotonesExportar data={exportData} /></div></div>
      <EstadoCarga isLoading={isLoading} isError={isError} vacio={clientes.length === 0} refetch={refetch} icono={Trophy}>
        <Bloque titulo="Clientes que más compran" icon={Trophy}>
          <table className="tbl">
            <thead><tr><th className="num" style={{ width: 48 }}>No.</th><th>Cliente</th><th className="num">Compras</th><th className="num">Total comprado</th></tr></thead>
            <tbody>
              {slice.map((c, i) => (
                <tr key={c.id}>
                  <td className="num muted tnum">{(meta.from ?? 1) + i}</td>
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
  const exportData: ReporteExportData | null = vendedores.length ? {
    titulo: 'Rendimiento de vendedores', rango: rangoTxt(desde, hasta),
    kpis: [{ label: 'Vendedores', value: fmtN(vendedores.length) }, { label: 'Ventas totales', value: q(totalVentas) }],
    tablas: [{ columnas: [{ label: 'No.' }, { label: 'Vendedor' }, { label: 'Rol' }, { label: 'Ventas', align: 'right' }, { label: 'Total', align: 'right' }],
      filas: vendedores.map((v, i) => [i + 1, `${v.nombres} ${v.apellidos}`.trim(), v.rol, fmtN(v.ventas_count), q(v.total_ventas)]) }],
  } : null
  return (
    <EstadoCarga isLoading={isLoading} isError={isError} vacio={vendedores.length === 0} refetch={refetch} icono={Users}>
      <div style={{ display: 'grid', gap: 16 }}>
        <div className="rep-acciones"><BotonesExportar data={exportData} /></div>
        <KpiStrip items={[
          { label: 'Vendedores con ventas', value: vendedores.length, icon: Users, tone: 'accent' },
          { label: 'Ventas totales', value: q(totalVentas), icon: Coins, tone: 'pos' },
        ]} />
        <Bloque titulo="Rendimiento por vendedor" icon={Users}>
          <table className="tbl">
            <thead><tr><th className="num" style={{ width: 48 }}>No.</th><th>Vendedor</th><th>Rol</th><th className="num">Ventas</th><th className="num">Total</th></tr></thead>
            <tbody>
              {slice.map((v, i) => (
                <tr key={v.id}>
                  <td className="num muted tnum">{(meta.from ?? 1) + i}</td>
                  <td style={{ fontWeight: 500 }}>{`${v.nombres} ${v.apellidos}`.trim()}</td>
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
    tablas: [{ columnas: [{ label: 'No.' }, { label: 'Sucursal' }, { label: 'Compl.', align: 'right' }, { label: 'Pend.', align: 'right' }, { label: 'Canc.', align: 'right' }, { label: 'Promedio', align: 'right' }, { label: 'Monto total', align: 'right' }],
      filas: sucursales.map((s, i) => [i + 1, s.nombre, fmtN(s.ventas_completadas), fmtN(s.ventas_pendientes), fmtN(s.ventas_canceladas), q(s.promedio_venta), q(s.monto_total)]) }],
  } : null
  return (
    <EstadoCarga isLoading={isLoading} isError={isError} vacio={sucursales.length === 0} refetch={refetch} icono={Building2}>
      <div style={{ display: 'grid', gap: 16 }}>
        <div className="rep-acciones"><BotonesExportar data={exportData} /></div>
        {r && (
          <KpiStrip items={[
            { label: 'Sucursales', value: r.total_sucursales, icon: Building2, tone: 'accent', sub: `${r.sucursales_activas} activas` },
            { label: 'Monto global', value: q(r.monto_total_global), icon: Coins, tone: 'pos' },
            { label: 'Transacciones', value: r.transacciones_total, icon: Receipt, tone: 'info' },
            { label: 'Mejor sucursal', value: r.mejor_sucursal, icon: Trophy, tone: 'violet' },
          ]} />
        )}
        <Bloque titulo="Ventas por sucursal" icon={Building2}>
          <table className="tbl">
            <thead><tr><th className="num" style={{ width: 48 }}>No.</th><th>Sucursal</th><th className="num">Completadas</th><th className="num">Pendientes</th><th className="num">Canceladas</th><th className="num">Promedio</th><th className="num">Monto total</th></tr></thead>
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
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="toolbar">
        <Select value={estadoStock} onValueChange={setEstadoStock} ariaLabel="Estado de stock"
          options={[{ value: 'todos', label: 'Todo el inventario' }, { value: 'normal', label: 'Stock normal' }, { value: 'bajo', label: 'Stock bajo' }, { value: 'agotado', label: 'Agotados' }]} />
        <Select value={categoria} onValueChange={setCategoria} ariaLabel="Categoría"
          options={[{ value: 'todos', label: 'Todas las categorías' }, ...cats.map((c) => ({ value: String(c.id), label: '— '.repeat(c.nivel) + c.nombre }))]} />
        <div style={{ marginLeft: 'auto' }}><BotonesExportar data={exportData} /></div>
      </div>
      <EstadoCarga isLoading={isLoading} isError={isError} vacio={!r} refetch={refetch} icono={Package}>
        {r && (
          <>
            <KpiStrip items={[
              { label: 'Productos', value: r.total_productos, icon: Package, tone: 'accent' },
              { label: 'Valor compra', value: q(r.valor_total_inventario), icon: Wallet, tone: 'info' },
              { label: 'Valor venta', value: q(r.valor_venta_total), icon: Coins, tone: 'pos' },
              { label: 'Stock bajo', value: r.productos_bajo_stock, icon: AlertTriangle, tone: 'warn' },
              { label: 'Agotados', value: r.productos_agotados, icon: XCircle, tone: 'neg' },
            ]} />
            <Bloque titulo="Productos" icon={Package}>
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
                        <td className="num tnum" style={{ fontWeight: 600 }}>{q(p.stock * p.precio_venta)}</td>
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
    tablas: [{ titulo: 'Ganancia por item', columnas: [{ label: 'No.' }, { label: 'Item' }, { label: 'Tipo' }, { label: 'Unid.', align: 'right' }, { label: 'Ingresos', align: 'right' }, { label: 'Costo', align: 'right' }, { label: 'Ganancia', align: 'right' }, { label: 'Margen', align: 'right' }],
      filas: items.map((it, i) => [i + 1, it.nombre, it.tipo, fmtN(it.unidades), q(it.ingresos), q(it.costo_total), q(it.ganancia), pct(it.margen)]) }],
  } : null
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="toolbar">
        <Select value={tipo} onValueChange={setTipo} ariaLabel="Tipo"
          options={[{ value: 'todos', label: 'Productos y servicios' }, { value: 'producto', label: 'Solo productos' }, { value: 'servicio', label: 'Solo servicios' }]} />
        <Select value={sucursal} onValueChange={setSucursal} ariaLabel="Sucursal"
          options={[{ value: 'todos', label: 'Todas las sucursales' }, ...(cat?.sucursales ?? []).map((s) => ({ value: String(s.id), label: s.nombre }))]} />
        <Select value={vendedor} onValueChange={setVendedor} ariaLabel="Vendedor"
          options={[{ value: 'todos', label: 'Todos los vendedores' }, ...(cat?.vendedores ?? []).map((v) => ({ value: String(v.id), label: v.nombre }))]} />
        <div style={{ marginLeft: 'auto' }}><BotonesExportar data={exportData} /></div>
      </div>
      <EstadoCarga isLoading={isLoading} isError={isError} vacio={!r || items.length === 0} refetch={refetch} icono={CircleDollarSign}>
        {r && (
          <>
            <KpiStrip items={[
              { label: 'Ingresos', value: q(r.ingresos_totales), icon: Coins, tone: 'info' },
              { label: 'Costos', value: q(r.costos_totales), icon: Wallet, tone: 'neg' },
              { label: 'Ganancia neta', value: q(r.ganancia_neta), icon: CircleDollarSign, tone: 'pos' },
              { label: 'Margen', value: pct(r.margen_porcentaje), icon: Percent, tone: 'violet' },
              { label: 'Items vendidos', value: r.items_vendidos, icon: Layers, tone: 'accent' },
            ]} />
            {porTipo && (
              <div className="gan-tipos">
                {Object.entries(porTipo).map(([t, v]) => (
                  <div key={t} className="card gan-tipo">
                    <div className="gan-tipo-head" style={{ textTransform: 'capitalize' }}>{t}</div>
                    <div className="gan-tipo-row"><span className="muted">Ingresos</span><span className="tnum">{q(v.ingresos)}</span></div>
                    <div className="gan-tipo-row"><span className="muted">Costos</span><span className="tnum">{q(v.costos)}</span></div>
                    <div className="gan-tipo-row" style={{ fontWeight: 700, color: 'var(--pos)' }}><span>Ganancia</span><span className="tnum">{q(v.ganancia)}</span></div>
                    <div className="muted" style={{ fontSize: 11.5 }}>{fmtN(v.unidades)} unidades</div>
                  </div>
                ))}
              </div>
            )}
            <Bloque titulo="Ganancia por item" icon={CircleDollarSign}>
              <table className="tbl">
                <thead><tr><th className="num" style={{ width: 48 }}>No.</th><th>Item</th><th>Tipo</th><th className="num">Unidades</th><th className="num">Ingresos</th><th className="num">Costo</th><th className="num">Ganancia</th><th className="num">Margen</th></tr></thead>
                <tbody>
                  {slice.map((it, i) => (
                    <tr key={i}>
                      <td className="num muted tnum">{(meta.from ?? 1) + i}</td>
                      <td style={{ fontWeight: 500 }}>{it.nombre}{!it.tiene_costo && <span className="muted" title="Sin costo registrado"> ⚠</span>}</td>
                      <td className="muted" style={{ textTransform: 'capitalize' }}>{it.tipo}</td>
                      <td className="num tnum">{fmtN(it.unidades)}</td>
                      <td className="num tnum">{q(it.ingresos)}</td>
                      <td className="num tnum muted">{q(it.costo_total)}</td>
                      <td className="num tnum" style={{ fontWeight: 600 }}>{q(it.ganancia)}</td>
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
  return (
    <EstadoCarga isLoading={isLoading} isError={isError} vacio={!r || r.total_pedidos === 0} refetch={refetch} icono={Store}>
      {r && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div className="rep-acciones"><BotonesExportar data={exportData} /></div>
          <KpiStrip items={[
            { label: 'Pedidos', value: r.total_pedidos, icon: ClipboardList, tone: 'accent' },
            { label: 'Monto total', value: q(r.monto_total), icon: Coins, tone: 'pos' },
            { label: 'Promedio', value: q(r.promedio), icon: TrendingUp, tone: 'info' },
            { label: 'Pedido máximo', value: q(r.pedido_maximo), icon: ArrowUpRight, tone: 'violet' },
          ]} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            <Desglose titulo="Por estado" data={r.por_estado} />
            <Desglose titulo="Por método de pago" data={r.por_metodo_pago} />
          </div>
          <Bloque titulo="Pedidos" icon={Store}>
            <table className="tbl">
              <thead><tr><th className="num" style={{ width: 48 }}>No.</th><th>N° Pedido</th><th>Fecha</th><th>Cliente</th><th>Estado</th><th className="num">Total</th></tr></thead>
              <tbody>
                {slice.map((p, i) => (
                  <tr key={p.id}>
                    <td className="num muted tnum">{(meta.from ?? 1) + i}</td>
                    <td style={{ fontWeight: 600, fontSize: 12 }}>{p.numero_pedido}</td>
                    <td className="muted" style={{ fontSize: 12 }}>{fmtFecha(p.created_at, true)}</td>
                    <td>{p.cuenta ? `${p.cuenta.nombre} ${p.cuenta.apellido}`.trim() : <span className="muted">—</span>}</td>
                    <td><span className="badge" style={{ textTransform: 'capitalize' }}><span className="b-dot" />{p.estado}</span></td>
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
