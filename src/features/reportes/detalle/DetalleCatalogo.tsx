import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import {
  Boxes, Layers, Package, Repeat, SlidersHorizontal, Wallet, Wrench, X,
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
import type { CatalogosDeCatalogo, RankingFila } from '@/types/reporte'

const POR_PAGINA = 20

const AVANZADOS = ['categoria_id', 'proveedor_id', 'marca', 'estado',
  'unidades_min', 'unidades_max', 'sin_ventas'] as const

const aIds = (valor?: string) => (valor ? valor.split(',').map(Number).filter(Boolean) : [])

/**
 * Ranking del catálogo, para productos o para servicios.
 *
 * El resumen solo muestra el top; aquí el mismo dato se ordena al revés y se
 * puede acotar a lo que no vendió nada, que es lo que identifica catálogo muerto
 * — la pregunta que un "top 20" no puede responder.
 */
export function DetalleCatalogo({ tipo }: { tipo: 'producto' | 'servicio' }) {
  const esServicio = tipo === 'servicio'
  const rango = rangoPorDefecto()
  const { filtros, setFiltros, limpiar } = useFiltrosUrl({ desde: rango.desde, hasta: rango.hasta })

  const desde = filtros.desde ?? rango.desde
  const hasta = filtros.hasta ?? rango.hasta
  const page = Number(filtros.page ?? 1)

  const [panelAbierto, setPanelAbierto] = useState(false)
  const [texto, setTexto] = useBusquedaUrl(filtros, setFiltros)

  const cambiar = (patch: Record<string, string>) => setFiltros({ ...patch, page: '' })

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['rep-catalogo-ranking', tipo, filtros],
    queryFn: () => reportesApi.catalogoRanking({
      ...aParams(filtros), tipo, fecha_inicio: desde, fecha_fin: hasta, per_page: POR_PAGINA,
    }),
    placeholderData: keepPreviousData,
  })

  const filas = data?.data ?? []
  const r = data?.resumen
  const cat = data?.catalogos as CatalogosDeCatalogo | undefined

  const avanzadosActivos = AVANZADOS.filter((k) => filtros[k]).length
  const totalActivos = avanzadosActivos + (filtros.search ? 1 : 0)

  const kpis: KpiItem[] = r ? [
    {
      label: esServicio ? 'Servicios' : 'Productos', value: r.items,
      icon: esServicio ? Wrench : Package, tone: 'accent', sub: 'en el catálogo',
    },
    { label: 'Con ventas', value: r.con_ventas, icon: Repeat, tone: 'pos', sub: 'se movieron' },
    // El complemento del top: lo que no vendió nada en todo el periodo
    {
      label: 'Sin ventas', value: r.sin_ventas, icon: Layers, tone: r.sin_ventas > 0 ? 'neg' : 'pos',
      sub: 'catálogo muerto',
      onClick: () => cambiar({ sin_ventas: filtros.sin_ventas ? '' : '1' }),
      activo: !!filtros.sin_ventas,
    },
    { label: 'Unidades', value: r.unidades, icon: Boxes, tone: 'info', sub: 'vendidas' },
    { label: 'Ingresos', value: q(r.ingresos), icon: Wallet, tone: 'violet' },
  ] : []

  const exportData: ReporteExportData | null = useMemo(() => r ? {
    titulo: esServicio ? 'Ranking de servicios' : 'Ranking de productos',
    rango: `Del ${fmtFecha(desde)} al ${fmtFecha(hasta)}`,
    kpis: [
      { label: 'En catálogo', value: fmtN(r.items) }, { label: 'Con ventas', value: fmtN(r.con_ventas) },
      { label: 'Sin ventas', value: fmtN(r.sin_ventas) }, { label: 'Unidades', value: fmtN(r.unidades) },
      { label: 'Ingresos', value: q(r.ingresos) },
    ],
    tablas: [{
      titulo: esServicio ? 'Servicios' : 'Productos',
      columnas: [{ label: esServicio ? 'Servicio' : 'Producto' }, { label: 'Unidades', align: 'right' },
        { label: 'Veces', align: 'right' }, { label: 'Ingreso', align: 'right' },
        { label: 'Costo', align: 'right' }, { label: 'Ganancia', align: 'right' }, { label: 'Margen', align: 'right' }],
      filas: filas.map((f) => [
        f.nombre_completo || f.nombre, fmtN(f.unidades_vendidas), fmtN(f.veces_vendido),
        q(f.ingreso_generado), q(f.costo_estimado), q(f.ganancia), pct(f.margen_porcentaje),
      ]),
    }],
  } : null, [r, filas, desde, hasta, esServicio])

  return (
    <DetalleShell
      titulo={esServicio ? 'Detalle de servicios' : 'Detalle de productos'}
      subtitulo="Ranking completo del catálogo, incluyendo lo que no se vendió"
      volverA="/reportes"
      cargandoFondo={isFetching}
      acciones={<BotonesExportar data={exportData} />}
      filtros={(
        <>
          <div className="toolbar">
            <BuscadorToolbar
              placeholder={esServicio ? 'Buscar por nombre o código…' : 'Buscar por nombre, SKU o marca…'}
              value={texto} onChange={setTexto} cargando={isFetching} />
            <RangoFechas desde={desde} hasta={hasta} onChange={(nuevo) => cambiar(nuevo)} />
            <Select value={filtros.sort ?? 'unidades_desc'} onValueChange={(v) => cambiar({ sort: v })} ariaLabel="Orden"
              options={[
                { value: 'unidades_desc', label: 'Más vendidos' },
                { value: 'unidades_asc', label: 'Menos vendidos' },
                { value: 'ingreso_desc', label: 'Mayor ingreso' },
                { value: 'ingreso_asc', label: 'Menor ingreso' },
                { value: 'veces_desc', label: 'Más veces vendido' },
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
              {/* Categoría, proveedor y marca solo existen en productos */}
              {!esServicio && (
                <>
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
                </>
              )}
              <Select value={filtros.estado ?? 'todos'} onValueChange={(v) => cambiar({ estado: v === 'todos' ? '' : v })} ariaLabel="Estado"
                options={[
                  { value: 'todos', label: 'Activos e inactivos' },
                  { value: 'activo', label: 'Solo activos' },
                  { value: 'inactivo', label: 'Solo inactivos' },
                ]} />
              <Select value={filtros.sin_ventas ?? 'todos'} onValueChange={(v) => cambiar({ sin_ventas: v === 'todos' ? '' : v })} ariaLabel="Movimiento"
                options={[
                  { value: 'todos', label: 'Con y sin ventas' },
                  { value: '1', label: 'Solo sin ventas' },
                ]} />
              <RangoNumerico etiqueta="Unidades" step={1}
                min={filtros.unidades_min ?? ''} max={filtros.unidades_max ?? ''}
                onChange={(x) => cambiar({ unidades_min: x.min, unidades_max: x.max })}
                onLimpiar={() => cambiar({ unidades_min: '', unidades_max: '' })} />
            </div>
          )}
        </>
      )}
      kpis={kpis}
      isLoading={isLoading}
      isError={isError}
      vacio={filas.length === 0}
      refetch={refetch}
      meta={data?.meta}
      page={page}
      setPage={(actualizar) => setFiltros({ page: String(actualizar(page)) })}
    >
      <table className="tbl">
        <thead>
          <tr>
            <th className="num col-no" style={{ width: 44 }}>No.</th>
            <th className="col-id">{esServicio ? 'Servicio' : 'Producto'}</th>
            {!esServicio && <th>Categoría</th>}
            {!esServicio && <th className="num">Stock</th>}
            <th className="num">Unidades</th>
            <th className="num" title="En cuántas ventas distintas apareció">Veces</th>
            <th className="num">Ingreso</th>
            <th className="num">Costo</th>
            <th className="num">Ganancia</th>
            <th className="num">Margen</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f, i) => (
            <FilaRanking key={f.id} f={f} numero={(data?.meta.from ?? 1) + i}
              esServicio={esServicio} desde={desde} hasta={hasta} />
          ))}
        </tbody>
      </table>
    </DetalleShell>
  )
}

function FilaRanking({ f, numero, esServicio, desde, hasta }: {
  f: RankingFila; numero: number; esServicio: boolean; desde: string; hasta: string
}) {
  const sinVentas = f.unidades_vendidas === 0
  const claveItem = esServicio ? `servicio_id=${f.id}` : `producto_id=${f.id}`

  return (
    <tr>
      <td className="num muted tnum col-no">{numero}</td>
      <td className="col-id">
        <Link to={`/${esServicio ? 'servicios' : 'productos'}/${f.id}`} style={{ fontWeight: 500 }}>
          {f.nombre_completo || f.nombre}
        </Link>
        <div className="muted" style={{ fontSize: 11 }}>
          {f.sku || f.codigo}{f.marca ? ` · ${f.marca}` : ''}
          {f.estado !== 'activo' && <span style={{ color: 'var(--warn)' }}> · inactivo</span>}
        </div>
      </td>
      {!esServicio && (
        <td className="muted" style={{ fontSize: 12 }}>
          {f.categorias?.map((c) => c.nombre).join(', ') || '—'}
        </td>
      )}
      {!esServicio && <td className="num tnum muted">{fmtN(f.stock ?? 0)}</td>}
      <td className="num tnum" style={sinVentas ? { color: 'var(--neg)', fontWeight: 600 } : { fontWeight: 600 }}>
        {sinVentas ? '0' : fmtN(f.unidades_vendidas)}
      </td>
      <td className="num tnum muted">{fmtN(f.veces_vendido)}</td>
      <td className="num tnum">{q(f.ingreso_generado)}</td>
      <td className="num tnum muted">
        {f.tiene_costo ? q(f.costo_estimado) : (
          <span title="Sin costo registrado: la ganancia sería el 100%">—</span>
        )}
      </td>
      <td className="num tnum" style={{ fontWeight: 600, color: f.ganancia >= 0 ? 'var(--pos)' : 'var(--neg)' }}>
        {q(f.ganancia)}
      </td>
      <td className="num tnum">
        {pct(f.margen_porcentaje)}
        {!sinVentas && (
          <div className="muted" style={{ fontSize: 10.5 }}>
            <Link to={`/reportes/detalle/ventas?desde=${desde}&hasta=${hasta}&${claveItem}`}>ver ventas</Link>
          </div>
        )}
      </td>
    </tr>
  )
}

export const DetalleProductos = () => <DetalleCatalogo tipo="producto" />
export const DetalleServicios = () => <DetalleCatalogo tipo="servicio" />
