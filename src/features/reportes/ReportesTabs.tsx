import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { Donut } from '@/components/charts'
import { StatPills } from '@/components/ui/StatPills'
import { Select } from '@/components/ui/Select'
import { reportesApi } from '@/lib/api'
import { q, fmtN, pct } from '@/lib/format'
import { EstadoCarga, PALETA } from './reportes-utils'
import { useState } from 'react'

interface RangoProps { desde: string; hasta: string }
const params = ({ desde, hasta }: RangoProps) => ({ fecha_inicio: desde, fecha_fin: hasta })

// ── Resumen general ───────────────────────────────────────────────────────
export function TabResumen() {
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['rep-resumen'], queryFn: reportesApi.resumen })
  const d = data?.data
  return (
    <EstadoCarga isLoading={isLoading} isError={isError} vacio={!d} refetch={refetch}>
      {d && (
        <div style={{ display: 'grid', gap: 16 }}>
          <Bloque titulo="Ventas">
            <StatPills items={[
              { label: 'Hoy', value: q(d.ventas.hoy), tone: 'pos' },
              { label: 'Semana', value: q(d.ventas.semana) },
              { label: 'Mes', value: q(d.ventas.mes) },
              { label: 'Total histórico', value: q(d.ventas.total) },
              { label: 'Promedio/venta', value: q(d.ventas.promedio_diario) },
            ]} />
          </Bloque>
          <Bloque titulo="Clientes">
            <StatPills items={[
              { label: 'Total', value: d.clientes.total },
              { label: 'Activos', value: d.clientes.activos, tone: 'pos' },
              { label: 'Nuevos (mes)', value: d.clientes.nuevos_mes },
              { label: 'Con ventas', value: d.clientes.con_ventas },
            ]} />
          </Bloque>
          <Bloque titulo="Inventario">
            <StatPills items={[
              { label: 'Productos', value: d.productos.total },
              { label: 'Stock bajo', value: d.productos.stock_bajo, tone: 'warn' },
              { label: 'Agotados', value: d.productos.agotados, tone: 'neg' },
              { label: 'Valor inventario', value: q(d.productos.valor_inventario) },
            ]} />
          </Bloque>
          <Bloque titulo="Usuarios">
            <StatPills items={[
              { label: 'Total', value: d.usuarios.total },
              { label: 'Activos', value: d.usuarios.activos, tone: 'pos' },
            ]} />
          </Bloque>
        </div>
      )}
    </EstadoCarga>
  )
}

// ── Ventas ────────────────────────────────────────────────────────────────
export function TabVentas({ desde, hasta }: RangoProps) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['rep-ventas', desde, hasta], queryFn: () => reportesApi.ventas(params({ desde, hasta })), placeholderData: keepPreviousData,
  })
  const r = data?.resumen
  const metodos = Object.entries(r?.por_metodo_pago ?? {})
  const segmentos = metodos.map(([k, v], i) => ({ label: k || 'N/D', value: v.total, color: PALETA[i % PALETA.length] }))
  return (
    <EstadoCarga isLoading={isLoading} isError={isError} vacio={!r || r.total_ventas === 0} refetch={refetch}>
      {r && (
        <div style={{ display: 'grid', gap: 16 }}>
          <StatPills items={[
            { label: 'Transacciones', value: r.total_ventas },
            { label: 'Monto total', value: q(r.monto_total), tone: 'pos' },
            { label: 'Promedio', value: q(r.promedio_venta ?? 0) },
            { label: 'Venta máxima', value: q(r.venta_maxima ?? 0) },
          ]} />
          {segmentos.length > 0 && (
            <Bloque titulo="Por método de pago">
              <div className="donut-row">
                <div className="donut-wrap"><Donut segments={segmentos} /></div>
                <div style={{ display: 'grid', gap: 8, flex: 1, minWidth: 200 }}>
                  {metodos.map(([k, v], i) => (
                    <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: PALETA[i % PALETA.length] }} />
                      <span style={{ textTransform: 'capitalize' }}>{k || 'No definido'}</span>
                      <span className="muted">· {v.cantidad}</span>
                      <span style={{ marginLeft: 'auto', fontWeight: 600 }}>{q(v.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Bloque>
          )}
        </div>
      )}
    </EstadoCarga>
  )
}

// ── Productos más vendidos ──────────────────────────────────────────────────
export function TabProductos({ desde, hasta }: RangoProps) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['rep-productos', desde, hasta], queryFn: () => reportesApi.productosMasVendidos(params({ desde, hasta })), placeholderData: keepPreviousData,
  })
  const productos = data?.productos ?? []
  return (
    <EstadoCarga isLoading={isLoading} isError={isError} vacio={productos.length === 0} refetch={refetch}>
      <table className="tbl">
        <thead><tr><th style={{ width: 40 }}>#</th><th>Producto</th><th className="num">Unidades</th><th className="num">Veces</th><th className="num">Total vendido</th></tr></thead>
        <tbody>
          {productos.map((p, i) => (
            <tr key={p.producto_id}>
              <td className="muted">{i + 1}</td>
              <td>{p.producto?.nombre ?? `#${p.producto_id}`}</td>
              <td className="num tnum" style={{ fontWeight: 600 }}>{fmtN(p.total_unidades)}</td>
              <td className="num tnum muted">{fmtN(p.veces_vendido)}</td>
              <td className="num tnum">{q(p.total_vendido)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </EstadoCarga>
  )
}

// ── Servicios más realizados ────────────────────────────────────────────────
export function TabServicios({ desde, hasta }: RangoProps) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['rep-servicios', desde, hasta], queryFn: () => reportesApi.serviciosMasRealizados(params({ desde, hasta })), placeholderData: keepPreviousData,
  })
  const servicios = data?.servicios ?? []
  return (
    <EstadoCarga isLoading={isLoading} isError={isError} vacio={servicios.length === 0} refetch={refetch}>
      <table className="tbl">
        <thead><tr><th style={{ width: 40 }}>#</th><th>Servicio</th><th className="num">Realizados</th><th className="num">Veces</th><th className="num">Total facturado</th></tr></thead>
        <tbody>
          {servicios.map((s, i) => (
            <tr key={s.servicio_id}>
              <td className="muted">{i + 1}</td>
              <td>{s.servicio?.nombre ?? `#${s.servicio_id}`}</td>
              <td className="num tnum" style={{ fontWeight: 600 }}>{fmtN(s.total_unidades)}</td>
              <td className="num tnum muted">{fmtN(s.veces_realizado)}</td>
              <td className="num tnum">{q(s.total_facturado)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </EstadoCarga>
  )
}

// ── Inventario ──────────────────────────────────────────────────────────────
export function TabInventario() {
  const [estadoStock, setEstadoStock] = useState('todos')
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['rep-inventario', estadoStock], queryFn: () => reportesApi.inventario({ estado_stock: estadoStock }), placeholderData: keepPreviousData,
  })
  const r = data?.resumen
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="toolbar">
        <Select value={estadoStock} onValueChange={setEstadoStock} ariaLabel="Estado de stock"
          options={[
            { value: 'todos', label: 'Todo el inventario' },
            { value: 'normal', label: 'Stock normal' },
            { value: 'bajo', label: 'Stock bajo' },
            { value: 'agotado', label: 'Agotados' },
          ]} />
      </div>
      <EstadoCarga isLoading={isLoading} isError={isError} vacio={!r} refetch={refetch}>
        {r && (
          <StatPills items={[
            { label: 'Productos', value: r.total_productos },
            { label: 'Valor compra', value: q(r.valor_total_inventario) },
            { label: 'Valor venta', value: q(r.valor_venta_total), tone: 'pos' },
            { label: 'Stock bajo', value: r.productos_bajo_stock, tone: 'warn' },
            { label: 'Agotados', value: r.productos_agotados, tone: 'neg' },
          ]} />
        )}
      </EstadoCarga>
    </div>
  )
}

// ── Top clientes ────────────────────────────────────────────────────────────
export function TabClientes({ desde, hasta }: RangoProps) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['rep-clientes', desde, hasta], queryFn: () => reportesApi.topClientes(params({ desde, hasta })), placeholderData: keepPreviousData,
  })
  const clientes = data?.clientes ?? []
  return (
    <EstadoCarga isLoading={isLoading} isError={isError} vacio={clientes.length === 0} refetch={refetch}>
      <table className="tbl">
        <thead><tr><th style={{ width: 40 }}>#</th><th>Cliente</th><th className="num">Compras</th><th className="num">Total comprado</th></tr></thead>
        <tbody>
          {clientes.map((c, i) => (
            <tr key={c.id}>
              <td className="muted">{i + 1}</td>
              <td>{c.nombre}</td>
              <td className="num tnum muted">{fmtN(c.ventas_count)}</td>
              <td className="num tnum" style={{ fontWeight: 600 }}>{q(c.total_comprado ?? 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </EstadoCarga>
  )
}

// ── Rendimiento vendedores ──────────────────────────────────────────────────
export function TabVendedores({ desde, hasta }: RangoProps) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['rep-vendedores', desde, hasta], queryFn: () => reportesApi.rendimientoVendedores(params({ desde, hasta })), placeholderData: keepPreviousData,
  })
  const vendedores = data?.vendedores ?? []
  return (
    <EstadoCarga isLoading={isLoading} isError={isError} vacio={vendedores.length === 0} refetch={refetch}>
      <table className="tbl">
        <thead><tr><th style={{ width: 40 }}>#</th><th>Vendedor</th><th>Rol</th><th className="num">Ventas</th><th className="num">Total</th></tr></thead>
        <tbody>
          {vendedores.map((v, i) => (
            <tr key={v.id}>
              <td className="muted">{i + 1}</td>
              <td>{`${v.nombres} ${v.apellidos}`.trim()}</td>
              <td className="muted" style={{ textTransform: 'capitalize' }}>{v.rol}</td>
              <td className="num tnum muted">{fmtN(v.ventas_count)}</td>
              <td className="num tnum" style={{ fontWeight: 600 }}>{q(v.total_ventas)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </EstadoCarga>
  )
}

// ── Sucursales ──────────────────────────────────────────────────────────────
export function TabSucursales({ desde, hasta }: RangoProps) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['rep-sucursales', desde, hasta], queryFn: () => reportesApi.sucursales(params({ desde, hasta })), placeholderData: keepPreviousData,
  })
  const sucursales = data?.sucursales ?? []
  return (
    <EstadoCarga isLoading={isLoading} isError={isError} vacio={sucursales.length === 0} refetch={refetch}>
      <table className="tbl">
        <thead><tr><th>Sucursal</th><th className="num">Completadas</th><th className="num">Pendientes</th><th className="num">Canceladas</th><th className="num">Promedio</th><th className="num">Monto total</th></tr></thead>
        <tbody>
          {sucursales.map((s) => (
            <tr key={s.id}>
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
    </EstadoCarga>
  )
}

// ── Ganancias ───────────────────────────────────────────────────────────────
export function TabGanancias({ desde, hasta }: RangoProps) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['rep-ganancias', desde, hasta], queryFn: () => reportesApi.ganancias(params({ desde, hasta })), placeholderData: keepPreviousData,
  })
  const r = data?.resumen
  const items = data?.items ?? []
  const porTipo = data?.por_tipo
  return (
    <EstadoCarga isLoading={isLoading} isError={isError} vacio={!r || items.length === 0} refetch={refetch}>
      {r && (
        <div style={{ display: 'grid', gap: 16 }}>
          <StatPills items={[
            { label: 'Ingresos', value: q(r.ingresos_totales) },
            { label: 'Costos', value: q(r.costos_totales) },
            { label: 'Ganancia neta', value: q(r.ganancia_neta), tone: 'pos' },
            { label: 'Margen', value: pct(r.margen_porcentaje) },
            { label: 'Items vendidos', value: r.items_vendidos },
          ]} />
          {porTipo && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              {Object.entries(porTipo).map(([tipo, v]) => (
                <div key={tipo} className="card" style={{ padding: 14 }}>
                  <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: 600 }}>{tipo}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12.5 }}><span className="muted">Ingresos</span><span>{q(v.ingresos)}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}><span className="muted">Costos</span><span>{q(v.costos)}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, fontWeight: 600, color: 'var(--success, #22c55e)' }}><span>Ganancia</span><span>{q(v.ganancia)}</span></div>
                </div>
              ))}
            </div>
          )}
          <Bloque titulo="Detalle por item">
            <table className="tbl">
              <thead><tr><th>Item</th><th>Tipo</th><th className="num">Unidades</th><th className="num">Ingresos</th><th className="num">Costo</th><th className="num">Ganancia</th><th className="num">Margen</th></tr></thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={i}>
                    <td>{it.nombre}{!it.tiene_costo && <span className="muted" title="Sin costo registrado"> ⚠</span>}</td>
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
          </Bloque>
        </div>
      )}
    </EstadoCarga>
  )
}

// ── Wrapper de bloque con título ────────────────────────────────────────────
function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <div style={{ padding: '12px var(--pad-card) 0', fontWeight: 600, fontSize: 13 }}>{titulo}</div>
      {children}
    </div>
  )
}
