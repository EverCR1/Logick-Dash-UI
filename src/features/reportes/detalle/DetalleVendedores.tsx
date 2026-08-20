import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { CircleDollarSign, Percent, Receipt, Scissors, UserCheck, Wallet } from 'lucide-react'
import type { KpiItem } from '@/components/ui/KpiGrid'
import { Select } from '@/components/ui/Select'
import { BuscadorToolbar } from '@/components/ui/BuscadorToolbar'
import { RangoFechas, rangoPorDefecto } from '@/components/ui/RangoFechas'
import { reportesApi } from '@/lib/api'
import { fmtFecha, fmtN, pct, q } from '@/lib/format'
import { BotonesExportar } from '../BotonesExportar'
import type { ReporteExportData } from '../ReportePDF'
import { DetalleShell } from './DetalleShell'
import { useBusquedaUrl } from './detalle-comunes'
import { aParams, useFiltrosUrl } from './useFiltrosUrl'
import type { VendedorDetalleFila } from '@/types/reporte'

/**
 * Detalle de vendedores: no solo cuánto vendió cada uno, sino con qué margen.
 *
 * Dos vendedores con el mismo monto pueden dejar ganancias muy distintas si uno
 * descuenta más o carga servicios de bajo margen. La lista no pagina: son las
 * personas del negocio, no transacciones, y caben en una pantalla.
 */
export function DetalleVendedores() {
  const rango = rangoPorDefecto()
  const { filtros, setFiltros } = useFiltrosUrl({ desde: rango.desde, hasta: rango.hasta })

  const desde = filtros.desde ?? rango.desde
  const hasta = filtros.hasta ?? rango.hasta

  const [texto, setTexto] = useBusquedaUrl(filtros, setFiltros)
  const cambiar = (patch: Record<string, string>) => setFiltros(patch)

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['rep-vendedores-detalle', filtros],
    queryFn: () => reportesApi.vendedoresDetalle({ ...aParams(filtros), fecha_inicio: desde, fecha_fin: hasta }),
    placeholderData: keepPreviousData,
  })

  const vendedores = data?.data ?? []
  const r = data?.resumen
  const cat = data?.catalogos

  // Referencia para las barras comparativas de la columna de facturado
  const maxFacturado = Math.max(1, ...vendedores.map((v) => v.facturado))

  const kpis: KpiItem[] = r ? [
    { label: 'Vendedores', value: r.vendedores, icon: UserCheck, tone: 'accent', sub: 'con ventas' },
    { label: 'Transacciones', value: r.transacciones, icon: Receipt, tone: 'info' },
    { label: 'Facturado', value: q(r.facturado), icon: Wallet, tone: 'violet' },
    { label: 'Ganancia', value: q(r.ganancia), icon: CircleDollarSign, tone: 'pos' },
    { label: 'Margen', value: pct(r.margen_porcentaje), icon: Percent, tone: 'accent' },
    // Lo que se dejó de cobrar por decisión del vendedor
    { label: 'Descuentos', value: q(r.descuentos), icon: Scissors, tone: 'warn', sub: 'otorgados' },
  ] : []

  const exportData: ReporteExportData | null = useMemo(() => r ? {
    titulo: 'Detalle de vendedores',
    rango: `Del ${fmtFecha(desde)} al ${fmtFecha(hasta)}`,
    kpis: [
      { label: 'Vendedores', value: fmtN(r.vendedores) }, { label: 'Transacciones', value: fmtN(r.transacciones) },
      { label: 'Facturado', value: q(r.facturado) }, { label: 'Ganancia', value: q(r.ganancia) },
      { label: 'Margen', value: pct(r.margen_porcentaje) },
    ],
    tablas: [{
      titulo: 'Rendimiento por vendedor',
      columnas: [{ label: 'Vendedor' }, { label: 'Sucursal' }, { label: 'Ventas', align: 'right' },
        { label: 'Facturado', align: 'right' }, { label: 'Ticket', align: 'right' },
        { label: 'Ganancia', align: 'right' }, { label: 'Margen', align: 'right' },
        { label: 'Descuentos', align: 'right' }],
      filas: vendedores.map((v) => [
        v.nombre, v.sucursal ?? '—', fmtN(v.transacciones), q(v.facturado), q(v.ticket_promedio),
        q(v.ganancia), pct(v.margen_porcentaje), q(v.descuentos),
      ]),
    }],
  } : null, [r, vendedores, desde, hasta])

  return (
    <DetalleShell
      titulo="Detalle de vendedores"
      subtitulo="Cuánto vende cada uno y, sobre todo, con qué margen"
      volverA="/reportes"
      anchoTabla={1020}
      cargandoFondo={isFetching}
      acciones={<BotonesExportar data={exportData} />}
      filtros={(
        <div className="toolbar">
          <BuscadorToolbar placeholder="Buscar por nombre, email o usuario…"
            value={texto} onChange={setTexto} cargando={isFetching} />
          <RangoFechas desde={desde} hasta={hasta} onChange={(nuevo) => cambiar(nuevo)} />
          <Select value={filtros.sucursal_id ?? 'todas'} onValueChange={(v) => cambiar({ sucursal_id: v === 'todas' ? '' : v })} ariaLabel="Sucursal"
            options={[{ value: 'todas', label: 'Todas las sucursales' }, ...(cat?.sucursales ?? []).map((s) => ({ value: String(s.id), label: s.nombre }))]} />
          <Select value={filtros.rol ?? 'todos'} onValueChange={(v) => cambiar({ rol: v === 'todos' ? '' : v })} ariaLabel="Rol"
            options={[
              { value: 'todos', label: 'Todos los roles' },
              { value: 'vendedor', label: 'Vendedores' },
              { value: 'administrador', label: 'Administradores' },
            ]} />
          <Select value={filtros.sort ?? 'facturado_desc'} onValueChange={(v) => cambiar({ sort: v })} ariaLabel="Orden"
            options={[
              { value: 'facturado_desc', label: 'Mayor facturado' },
              { value: 'ganancia_desc', label: 'Mayor ganancia' },
              { value: 'margen_desc', label: 'Mayor margen' },
              { value: 'margen_asc', label: 'Menor margen' },
              { value: 'ticket_desc', label: 'Mayor ticket' },
              { value: 'descuentos_desc', label: 'Más descuentos' },
              { value: 'transacciones_desc', label: 'Más ventas' },
              { value: 'nombre', label: 'Nombre' },
            ]} />
          <Select value={filtros.incluir_sin_ventas ?? '0'} onValueChange={(v) => cambiar({ incluir_sin_ventas: v === '0' ? '' : v })} ariaLabel="Sin ventas"
            options={[
              { value: '0', label: 'Solo con ventas' },
              { value: '1', label: 'Incluir sin ventas' },
            ]} />
        </div>
      )}
      kpis={kpis}
      isLoading={isLoading}
      isError={isError}
      vacio={vendedores.length === 0}
      refetch={refetch}
    >
      <table className="tbl">
        <thead>
          <tr>
            <th className="num col-no" style={{ width: 44 }}>No.</th>
            <th className="col-id">Vendedor</th>
            <th>Sucursal</th>
            <th className="num">Ventas</th>
            <th style={{ width: 190 }}>Facturado</th>
            <th className="num">Ticket</th>
            <th className="num">Ganancia</th>
            <th className="num">Margen</th>
            <th className="num">Descuentos</th>
            <th className="num" title="Unidades de producto frente a unidades de servicio">Mix</th>
          </tr>
        </thead>
        <tbody>
          {vendedores.map((v, i) => (
            <FilaVendedor key={v.id} v={v} numero={i + 1} maximo={maxFacturado} desde={desde} hasta={hasta} />
          ))}
        </tbody>
      </table>
    </DetalleShell>
  )
}

function FilaVendedor({ v, numero, maximo, desde, hasta }: {
  v: VendedorDetalleFila; numero: number; maximo: number; desde: string; hasta: string
}) {
  const unidades = v.unidades_producto + v.unidades_servicio
  const pctProducto = unidades > 0 ? (v.unidades_producto / unidades) * 100 : 0

  return (
    <tr>
      <td className="num muted tnum col-no">{numero}</td>
      <td className="col-id">
        <Link to={`/usuarios/${v.id}`} style={{ fontWeight: 500 }}>{v.nombre}</Link>
        <div className="muted" style={{ fontSize: 11, textTransform: 'capitalize' }}>{v.rol}</div>
      </td>
      <td className="muted" style={{ fontSize: 12 }}>{v.sucursal ?? '—'}</td>
      <td className="num tnum">{fmtN(v.transacciones)}</td>
      <td>
        <div className="barrow-track" style={{ height: 8 }}>
          <span style={{ width: `${(v.facturado / maximo) * 100}%`, background: 'var(--accent)' }} />
        </div>
        <div className="tnum" style={{ fontSize: 12, fontWeight: 600, marginTop: 3 }}>{q(v.facturado)}</div>
      </td>
      <td className="num tnum muted">{q(v.ticket_promedio)}</td>
      <td className="num tnum" style={{ fontWeight: 600, color: v.ganancia >= 0 ? 'var(--pos)' : 'var(--neg)' }}>
        {q(v.ganancia)}
      </td>
      <td className="num tnum">
        <span style={{ color: v.margen_porcentaje >= 30 ? 'var(--pos)' : v.margen_porcentaje >= 15 ? 'var(--warn)' : 'var(--neg)' }}>
          {pct(v.margen_porcentaje)}
        </span>
        {v.ingreso_sin_costo > 0 && (
          <div className="muted" style={{ fontSize: 10 }} title={`${q(v.ingreso_sin_costo)} de ingreso sin costo registrado`}>⚠ estimado</div>
        )}
      </td>
      <td className="num tnum" style={v.descuentos > 0 ? { color: 'var(--warn)' } : { color: 'var(--text-faint)' }}>
        {v.descuentos > 0 ? q(v.descuentos) : '—'}
      </td>
      <td className="num" style={{ fontSize: 11 }}>
        <div className="muted">{fmtN(v.unidades_producto)}p / {fmtN(v.unidades_servicio)}s</div>
        <div className="barrow-track" style={{ height: 5, marginTop: 3 }}>
          <span style={{ width: `${pctProducto}%`, background: 'var(--info)' }} />
        </div>
        <div className="muted" style={{ fontSize: 10, marginTop: 2 }}>
          <Link to={`/reportes/detalle/ventas?desde=${desde}&hasta=${hasta}&vendedor_id=${v.id}`}>ver ventas</Link>
        </div>
      </td>
    </tr>
  )
}
