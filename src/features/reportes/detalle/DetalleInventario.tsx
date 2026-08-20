import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import {
  AlertTriangle, Ban, Coins, Hourglass, Package, Percent, SlidersHorizontal, TrendingUp, X,
} from 'lucide-react'
import type { KpiItem } from '@/components/ui/KpiGrid'
import { Select } from '@/components/ui/Select'
import { MultiSelect } from '@/components/ui/MultiSelect'
import { BuscadorToolbar } from '@/components/ui/BuscadorToolbar'
import { RangoFechas, rangoPorDefecto } from '@/components/ui/RangoFechas'
import { RangoNumerico } from '@/components/ui/RangoNumerico'
import { reportesApi } from '@/lib/api'
import { fmtFecha, fmtN, pct, q } from '@/lib/format'
import { BotonesExportar } from '../BotonesExportar'
import type { ReporteExportData } from '../ReportePDF'
import { DetalleShell } from './DetalleShell'
import { useBusquedaUrl } from './detalle-comunes'
import { aParams, useFiltrosUrl } from './useFiltrosUrl'
import type { InventarioDetalleFila } from '@/types/reporte'

const POR_PAGINA = 20

const AVANZADOS = ['categoria_id', 'proveedor_id', 'marca', 'stock_min', 'stock_max', 'sin_movimiento'] as const

/** Lista de ids separados por coma ↔ array, como en el índice de productos. */
const aIds = (valor?: string) => (valor ? valor.split(',').map(Number).filter(Boolean) : [])

/**
 * Detalle de inventario: el stock de hoy cruzado con su movimiento en el periodo.
 *
 * El resumen dice cuánto hay y cuánto vale; esto dice si se mueve, que es lo que
 * separa inventario sano de capital dormido.
 */
export function DetalleInventario() {
  const rango = rangoPorDefecto()
  const { filtros, setFiltros, limpiar } = useFiltrosUrl({ desde: rango.desde, hasta: rango.hasta })

  const desde = filtros.desde ?? rango.desde
  const hasta = filtros.hasta ?? rango.hasta
  const page = Number(filtros.page ?? 1)

  const [panelAbierto, setPanelAbierto] = useState(false)
  const [texto, setTexto] = useBusquedaUrl(filtros, setFiltros)

  const cambiar = (patch: Record<string, string>) => setFiltros({ ...patch, page: '' })

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['rep-inventario-detalle', filtros],
    queryFn: () => reportesApi.inventarioDetalle({
      ...aParams(filtros), fecha_inicio: desde, fecha_fin: hasta, per_page: POR_PAGINA,
    }),
    placeholderData: keepPreviousData,
  })

  const productos = data?.data ?? []
  const r = data?.resumen
  const cat = data?.catalogos

  const avanzadosActivos = AVANZADOS.filter((k) => filtros[k]).length
  const totalActivos = avanzadosActivos + (filtros.search ? 1 : 0) + (filtros.estado_stock ? 1 : 0)

  const kpis: KpiItem[] = r ? [
    { label: 'Productos', value: r.productos, icon: Package, tone: 'accent', sub: `${fmtN(r.unidades)} unidades` },
    { label: 'Valor compra', value: q(r.valor_compra), icon: Coins, tone: 'info', sub: 'capital invertido' },
    { label: 'Valor venta', value: q(r.valor_venta), icon: TrendingUp, tone: 'violet', sub: 'si se vende todo' },
    { label: 'Margen potencial', value: q(r.margen_potencial), icon: Percent, tone: 'pos' },
    {
      label: 'Stock bajo', value: r.bajo_stock, icon: AlertTriangle, tone: 'warn', sub: 'por reponer',
      onClick: () => cambiar({ estado_stock: filtros.estado_stock === 'bajo' ? '' : 'bajo' }),
      activo: filtros.estado_stock === 'bajo',
    },
    {
      label: 'Agotados', value: r.agotados, icon: Ban, tone: 'neg', sub: 'sin existencias',
      onClick: () => cambiar({ estado_stock: filtros.estado_stock === 'agotado' ? '' : 'agotado' }),
      activo: filtros.estado_stock === 'agotado',
    },
    // Capital dormido: existe, vale dinero y no rotó en todo el periodo
    {
      label: 'Sin movimiento', value: r.sin_movimiento, icon: Hourglass, tone: 'neg',
      sub: `en ${fmtN(r.dias_periodo)} días`,
      onClick: () => cambiar({ sin_movimiento: filtros.sin_movimiento ? '' : '1' }),
      activo: !!filtros.sin_movimiento,
    },
  ] : []

  const exportData: ReporteExportData | null = useMemo(() => r ? {
    titulo: 'Detalle de inventario',
    rango: `Movimiento del ${fmtFecha(desde)} al ${fmtFecha(hasta)}`,
    kpis: [
      { label: 'Productos', value: fmtN(r.productos) }, { label: 'Valor compra', value: q(r.valor_compra) },
      { label: 'Valor venta', value: q(r.valor_venta) }, { label: 'Stock bajo', value: fmtN(r.bajo_stock) },
      { label: 'Sin movimiento', value: fmtN(r.sin_movimiento) },
    ],
    tablas: [{
      titulo: 'Inventario con movimiento',
      columnas: [{ label: 'Producto' }, { label: 'SKU' }, { label: 'Stock', align: 'right' },
        { label: 'Vendidas', align: 'right' }, { label: 'Cobertura', align: 'right' },
        { label: 'Valor compra', align: 'right' }, { label: 'Margen', align: 'right' }],
      filas: productos.map((p) => [
        p.nombre_completo || p.nombre, p.sku, fmtN(p.stock), fmtN(p.unidades_vendidas),
        p.dias_cobertura === null ? 'Sin rotación' : `${fmtN(p.dias_cobertura)} d`,
        q(p.valor_compra), pct(p.margen_porcentaje),
      ]),
    }],
  } : null, [r, productos, desde, hasta])

  return (
    <DetalleShell
      titulo="Detalle de inventario"
      subtitulo="Stock actual cruzado con su rotación en el periodo"
      volverA="/reportes"
      cargandoFondo={isFetching}
      acciones={<BotonesExportar data={exportData} />}
      filtros={(
        <>
          <div className="toolbar">
            <BuscadorToolbar placeholder="Buscar por nombre, SKU, marca o ubicación…"
              value={texto} onChange={setTexto} cargando={isFetching} />
            {/* El rango solo afecta a las métricas de movimiento: el stock es el de hoy */}
            <RangoFechas desde={desde} hasta={hasta} onChange={(nuevo) => cambiar(nuevo)} etiqueta="Movimiento" />
            <Select value={filtros.estado_stock ?? 'todos'} onValueChange={(v) => cambiar({ estado_stock: v === 'todos' ? '' : v })} ariaLabel="Estado de stock"
              options={[
                { value: 'todos', label: 'Todo el inventario' },
                { value: 'normal', label: 'Stock normal' },
                { value: 'riesgo', label: 'Bajo mínimo (con agotados)' },
                { value: 'bajo', label: 'Stock bajo' },
                { value: 'agotado', label: 'Agotados' },
              ]} />
            <Select value={filtros.sort ?? 'valor_desc'} onValueChange={(v) => cambiar({ sort: v })} ariaLabel="Orden"
              options={[
                { value: 'valor_desc', label: 'Mayor valor en stock' },
                { value: 'cobertura_desc', label: 'Capital más dormido' },
                { value: 'vendidas_desc', label: 'Más vendidos' },
                { value: 'vendidas_asc', label: 'Menos vendidos' },
                { value: 'stock_desc', label: 'Mayor stock' },
                { value: 'stock_asc', label: 'Menor stock' },
                { value: 'margen_desc', label: 'Mayor margen' },
                { value: 'margen_asc', label: 'Menor margen' },
                { value: 'nombre', label: 'Nombre' },
              ]} />
            <button className="btn" data-on={panelAbierto || undefined} onClick={() => setPanelAbierto((v) => !v)}
              title="Más filtros" aria-expanded={panelAbierto}>
              <SlidersHorizontal size={15} /> Más filtros
              {avanzadosActivos > 0 && <span className="btn-conteo">{avanzadosActivos}</span>}
            </button>
            {totalActivos >= 2 && (
              <button className="btn" onClick={() => { setTexto(''); limpiar(['desde', 'hasta']) }} title="Limpiar filtros">
                <X size={15} /> Limpiar
              </button>
            )}
          </div>

          {panelAbierto && (
            <div className="filtros-panel">
              <MultiSelect
                options={(cat?.categorias ?? []).map((c) => ({ value: c.id, label: c.nombre }))}
                selected={aIds(filtros.categoria_id)}
                onChange={(ids) => cambiar({ categoria_id: ids.join(',') })}
                placeholder="Todas las categorías" sustantivo="categorías"
                compacto searchable searchPlaceholder="Buscar categoría…" mostrarNivel={false}
              />
              <MultiSelect
                options={(cat?.proveedores ?? []).map((p) => ({ value: p.id, label: p.nombre }))}
                selected={aIds(filtros.proveedor_id)}
                onChange={(ids) => cambiar({ proveedor_id: ids.join(',') })}
                placeholder="Todos los proveedores" sustantivo="proveedores"
                compacto searchable searchPlaceholder="Buscar proveedor…" mostrarNivel={false}
              />
              <Select value={filtros.marca ?? 'todas'} onValueChange={(v) => cambiar({ marca: v === 'todas' ? '' : v })} ariaLabel="Marca"
                options={[{ value: 'todas', label: 'Todas las marcas' }, ...(cat?.marcas ?? []).map((m) => ({ value: m, label: m }))]} />
              <RangoNumerico etiqueta="Stock" step={1}
                min={filtros.stock_min ?? ''} max={filtros.stock_max ?? ''}
                onChange={(x) => cambiar({ stock_min: x.min, stock_max: x.max })}
                onLimpiar={() => cambiar({ stock_min: '', stock_max: '' })} />
            </div>
          )}
        </>
      )}
      kpis={kpis}
      isLoading={isLoading}
      isError={isError}
      vacio={productos.length === 0}
      refetch={refetch}
      meta={data?.meta}
      page={page}
      setPage={(actualizar) => setFiltros({ page: String(actualizar(page)) })}
    >
      <table className="tbl">
        <thead>
          <tr>
            <th className="num col-no" style={{ width: 44 }}>No.</th>
            <th className="col-id">Producto</th>
            <th>Proveedor</th>
            <th className="num">Stock</th>
            <th className="num">Vendidas</th>
            <th className="num" title="Días que aguanta el stock al ritmo de venta del periodo">Cobertura</th>
            <th className="num">Última venta</th>
            <th className="num">Valor compra</th>
            <th className="num">Margen</th>
          </tr>
        </thead>
        <tbody>
          {productos.map((p, i) => (
            <FilaInventario key={p.id} p={p} numero={(data?.meta.from ?? 1) + i} desde={desde} hasta={hasta} />
          ))}
        </tbody>
      </table>
    </DetalleShell>
  )
}

function FilaInventario({ p, numero, desde, hasta }: {
  p: InventarioDetalleFila; numero: number; desde: string; hasta: string
}) {
  const agotado = p.stock <= 0
  const bajo = !agotado && p.stock <= p.stock_minimo
  // Sin rotación y con stock es la señal de capital inmovilizado
  const dormido = p.unidades_vendidas === 0 && p.stock > 0

  return (
    <tr>
      <td className="num muted tnum col-no">{numero}</td>
      <td className="col-id">
        <Link to={`/productos/${p.id}`} style={{ fontWeight: 500 }}>{p.nombre_completo || p.nombre}</Link>
        <div className="muted" style={{ fontSize: 11 }}>
          {p.sku}{p.marca ? ` · ${p.marca}` : ''}
        </div>
      </td>
      <td className="muted" style={{ fontSize: 12 }}>{p.proveedor?.nombre ?? '—'}</td>
      <td className="num tnum">
        <span style={agotado ? { color: 'var(--neg)', fontWeight: 600 } : bajo ? { color: 'var(--warn)', fontWeight: 600 } : undefined}>
          {fmtN(p.stock)}
        </span>
        <div className="muted" style={{ fontSize: 10.5 }}>mín. {fmtN(p.stock_minimo)}</div>
      </td>
      <td className="num tnum">
        {fmtN(p.unidades_vendidas)}
        <div className="muted" style={{ fontSize: 10.5 }}>{q(p.ingreso_generado)}</div>
      </td>
      <td className="num tnum">
        {p.dias_cobertura === null ? (
          <span className="badge" data-tone={dormido ? 'neg' : undefined}>
            <span className="b-dot" />Sin rotación
          </span>
        ) : (
          <span style={p.dias_cobertura > 180 ? { color: 'var(--warn)' } : undefined}>
            {fmtN(p.dias_cobertura)} d
          </span>
        )}
      </td>
      <td className="num muted tnum" style={{ fontSize: 12 }}>
        {p.ultima_venta ? fmtFecha(p.ultima_venta) : 'Nunca'}
      </td>
      <td className="num tnum" style={{ fontWeight: 600 }}>
        {q(p.valor_compra)}
        <div className="muted" style={{ fontSize: 10.5, fontWeight: 400 }}>venta {q(p.valor_venta)}</div>
      </td>
      <td className="num tnum">
        <span style={{ color: p.margen_porcentaje >= 30 ? 'var(--pos)' : p.margen_porcentaje >= 15 ? 'var(--warn)' : 'var(--neg)' }}>
          {pct(p.margen_porcentaje)}
        </span>
        <div className="muted" style={{ fontSize: 10.5 }}>
          <Link to={`/reportes/detalle/ventas?desde=${desde}&hasta=${hasta}&producto_id=${p.id}`}>ver ventas</Link>
        </div>
      </td>
    </tr>
  )
}
