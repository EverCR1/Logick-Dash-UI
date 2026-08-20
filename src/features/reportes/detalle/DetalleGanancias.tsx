import { useMemo, useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import {
  ChevronDown, ChevronRight, CircleDollarSign, Coins, Percent, Receipt,
  SlidersHorizontal, TriangleAlert, Wallet, X,
} from 'lucide-react'
import type { KpiItem } from '@/components/ui/KpiGrid'
import { Select } from '@/components/ui/Select'
import { BuscadorToolbar } from '@/components/ui/BuscadorToolbar'
import { RangoFechas, rangoPorDefecto } from '@/components/ui/RangoFechas'
import { RangoNumerico } from '@/components/ui/RangoNumerico'
import { reportesApi } from '@/lib/api'
import { fmtFecha, fmtN, pct, q } from '@/lib/format'
import { ChipItem, OPCIONES_METODO, useBusquedaUrl } from './detalle-comunes'
import { METODO_LABEL } from '../../ventas/venta-estados'
import { DetalleVenta } from '../../ventas/DetalleVenta'
import { BotonesExportar } from '../BotonesExportar'
import type { ReporteExportData } from '../ReportePDF'
import { DetalleShell } from './DetalleShell'
import { aParams, useFiltrosUrl } from './useFiltrosUrl'
import type { GananciaEvento } from '@/types/reporte'

const POR_PAGINA = 20

/** Filtros que viven en el panel plegable; su conteo va en la insignia del botón. */
const AVANZADOS = ['sucursal_id', 'vendedor_id', 'cliente_id', 'origen', 'metodo_pago',
  'margen_min', 'margen_max', 'monto_min', 'monto_max', 'sin_costo'] as const

const margenDe = (ev: { ingreso: number; ganancia: number }) =>
  ev.ingreso > 0 ? (ev.ganancia / ev.ingreso) * 100 : 0

/**
 * Detalle de ganancias: cada fila es un evento de ingreso —una venta de contado
 * o un abono de crédito—, que es el nivel al que la pestaña de resumen agrega
 * por item. Al desplegar una fila se ve el aporte de cada línea de la venta.
 */
export function DetalleGanancias() {
  const rango = rangoPorDefecto()
  const { filtros, setFiltros, limpiar } = useFiltrosUrl({ desde: rango.desde, hasta: rango.hasta })

  const desde = filtros.desde ?? rango.desde
  const hasta = filtros.hasta ?? rango.hasta
  const page = Number(filtros.page ?? 1)

  const [panelAbierto, setPanelAbierto] = useState(false)
  const [verVenta, setVerVenta] = useState<number | null>(null)
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set())
  const [texto, setTexto] = useBusquedaUrl(filtros, setFiltros)

  const cambiar = (patch: Record<string, string>) => setFiltros({ ...patch, page: '' })

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['rep-ganancias-eventos', filtros],
    queryFn: () => reportesApi.gananciasEventos({
      ...aParams(filtros),
      fecha_inicio: desde,
      fecha_fin: hasta,
      per_page: POR_PAGINA,
    }),
    placeholderData: keepPreviousData,
  })

  const eventos = data?.data ?? []
  const r = data?.resumen
  const cat = data?.catalogos
  const item = data?.filtro_item

  const avanzadosActivos = AVANZADOS.filter((k) => filtros[k]).length
  // El rango de fechas no cuenta: siempre hay uno puesto
  const totalActivos = avanzadosActivos + (filtros.search ? 1 : 0) + (filtros.tipo ? 1 : 0)
    + (filtros.producto_id || filtros.servicio_id ? 1 : 0)

  const kpis: KpiItem[] = r ? [
    { label: 'Ingresos', value: q(r.ingresos), icon: Wallet, tone: 'info' },
    { label: 'Costos', value: q(r.costos), icon: Coins, tone: 'warn' },
    { label: 'Ganancia', value: q(r.ganancia), icon: CircleDollarSign, tone: r.ganancia >= 0 ? 'pos' : 'neg' },
    { label: 'Margen', value: pct(r.margen_porcentaje), icon: Percent, tone: 'accent' },
    { label: 'Eventos', value: r.eventos, icon: Receipt, tone: 'violet', sub: 'ventas y abonos' },
    // Cuánta de la ganancia mostrada no es confiable: sale de líneas sin costo
    // registrado, que por tanto cuentan como 100% de margen.
    {
      label: 'Sin costo', value: q(r.ingresos_sin_costo), icon: TriangleAlert,
      tone: r.ingresos_sin_costo > 0 ? 'neg' : 'pos', sub: 'ingreso sin costo',
      onClick: () => cambiar({ sin_costo: filtros.sin_costo ? '' : '1' }),
      activo: !!filtros.sin_costo,
    },
  ] : []

  const exportData: ReporteExportData | null = useMemo(() => r ? {
    titulo: 'Detalle de ganancias',
    rango: `Del ${fmtFecha(desde)} al ${fmtFecha(hasta)}`,
    kpis: [
      { label: 'Ingresos', value: q(r.ingresos) }, { label: 'Costos', value: q(r.costos) },
      { label: 'Ganancia', value: q(r.ganancia) }, { label: 'Margen', value: pct(r.margen_porcentaje) },
      { label: 'Eventos', value: fmtN(r.eventos) },
    ],
    tablas: [{
      titulo: 'Eventos de ingreso',
      columnas: [{ label: 'Fecha' }, { label: 'Origen' }, { label: 'Cliente' }, { label: 'Sucursal' },
        { label: 'Ingreso', align: 'right' }, { label: 'Costo', align: 'right' },
        { label: 'Ganancia', align: 'right' }, { label: 'Margen', align: 'right' }],
      filas: eventos.map((ev) => [
        fmtFecha(ev.fecha),
        ev.origen === 'abono' ? `${ev.numero_venta} (abono ${pct(ev.ratio * 100)})` : ev.numero_venta,
        ev.cliente, ev.sucursal, q(ev.ingreso), q(ev.costo), q(ev.ganancia), pct(margenDe(ev)),
      ]),
    }],
  } : null, [r, eventos, desde, hasta])

  const alternar = (clave: string) => setExpandidas((prev) => {
    const siguiente = new Set(prev)
    siguiente.has(clave) ? siguiente.delete(clave) : siguiente.add(clave)
    return siguiente
  })

  return (
    <DetalleShell
      titulo="Detalle de ganancias"
      subtitulo="Cada venta de contado y cada abono de crédito que aportó ingreso"
      volverA="/reportes"
      anchoTabla={1040}
      cargandoFondo={isFetching}
      acciones={<BotonesExportar data={exportData} />}
      filtros={(
        <>
          <div className="toolbar">
            <BuscadorToolbar
              placeholder="Buscar por N° venta, cliente, vendedor o producto…"
              value={texto} onChange={setTexto} cargando={isFetching}
            />
            <RangoFechas desde={desde} hasta={hasta} onChange={(nuevo) => cambiar(nuevo)} />
            <Select value={filtros.tipo ?? 'todos'} onValueChange={(v) => cambiar({ tipo: v === 'todos' ? '' : v })} ariaLabel="Tipo"
              options={[
                { value: 'todos', label: 'Productos y servicios' },
                { value: 'producto', label: 'Solo productos' },
                { value: 'servicio', label: 'Solo servicios' },
              ]} />
            <Select value={filtros.sort ?? 'fecha_desc'} onValueChange={(v) => cambiar({ sort: v })} ariaLabel="Orden"
              options={[
                { value: 'fecha_desc', label: 'Más recientes' },
                { value: 'fecha_asc', label: 'Más antiguos' },
                { value: 'ganancia_desc', label: 'Mayor ganancia' },
                { value: 'ganancia_asc', label: 'Menor ganancia' },
                { value: 'margen_desc', label: 'Mayor margen' },
                { value: 'margen_asc', label: 'Menor margen' },
                { value: 'ingreso_desc', label: 'Mayor ingreso' },
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

          <ChipItem item={item ?? null} onQuitar={() => cambiar({ producto_id: '', servicio_id: '' })} />

          {panelAbierto && (
            <div className="filtros-panel">
              <Select value={filtros.sucursal_id ?? 'todos'} onValueChange={(v) => cambiar({ sucursal_id: v === 'todos' ? '' : v })} ariaLabel="Sucursal"
                options={[{ value: 'todos', label: 'Todas las sucursales' }, ...(cat?.sucursales ?? []).map((s) => ({ value: String(s.id), label: s.nombre }))]} />
              <Select value={filtros.vendedor_id ?? 'todos'} onValueChange={(v) => cambiar({ vendedor_id: v === 'todos' ? '' : v })} ariaLabel="Vendedor"
                options={[{ value: 'todos', label: 'Todos los vendedores' }, ...(cat?.vendedores ?? []).map((v) => ({ value: String(v.id), label: v.nombre }))]} />
              <Select value={filtros.cliente_id ?? 'todos'} onValueChange={(v) => cambiar({ cliente_id: v === 'todos' ? '' : v })} ariaLabel="Cliente"
                options={[{ value: 'todos', label: 'Todos los clientes' }, ...(cat?.clientes ?? []).map((c) => ({ value: String(c.id), label: c.nombre }))]} />
              <Select value={filtros.origen ?? 'todos'} onValueChange={(v) => cambiar({ origen: v === 'todos' ? '' : v })} ariaLabel="Origen del ingreso"
                options={[
                  { value: 'todos', label: 'Contado y abonos' },
                  { value: 'contado', label: 'Solo contado' },
                  { value: 'abono', label: 'Solo abonos de crédito' },
                ]} />
              <Select value={filtros.metodo_pago ?? 'todos'} onValueChange={(v) => cambiar({ metodo_pago: v === 'todos' ? '' : v })}
                ariaLabel="Método de pago" options={OPCIONES_METODO} />
              <RangoNumerico prefijo="%" etiqueta="Margen" step={1}
                min={filtros.margen_min ?? ''} max={filtros.margen_max ?? ''}
                onChange={(x) => cambiar({ margen_min: x.min, margen_max: x.max })}
                onLimpiar={() => cambiar({ margen_min: '', margen_max: '' })} />
              <RangoNumerico prefijo="Q" etiqueta="Ingreso" step={1}
                min={filtros.monto_min ?? ''} max={filtros.monto_max ?? ''}
                onChange={(x) => cambiar({ monto_min: x.min, monto_max: x.max })}
                onLimpiar={() => cambiar({ monto_min: '', monto_max: '' })} />
            </div>
          )}
        </>
      )}
      kpis={kpis}
      isLoading={isLoading}
      isError={isError}
      vacio={eventos.length === 0}
      refetch={refetch}
      meta={data?.meta}
      page={page}
      setPage={(actualizar) => setFiltros({ page: String(actualizar(page)) })}
    >
      <table className="tbl">
        <thead>
          <tr>
            <th style={{ width: 34 }} />
            <th className="num col-no" style={{ width: 44 }}>No.</th>
            <th style={{ width: 100 }}>Fecha</th>
            <th className="col-id">Origen</th>
            <th>Cliente</th>
            <th>Sucursal</th>
            <th>Vendedor</th>
            <th className="num">Ingreso</th>
            <th className="num">Costo</th>
            <th className="num">Ganancia</th>
            <th className="num">Margen</th>
          </tr>
        </thead>
        <tbody>
          {eventos.map((ev, i) => {
            const clave = `${ev.origen}-${ev.pago_id ?? ev.venta_id}`
            const abierta = expandidas.has(clave)
            const sinCosto = ev.items.some((l) => !l.tiene_costo)

            return [
              <tr key={clave} data-abierta={abierta || undefined}>
                <td>
                  <button type="button" className="icon-btn" onClick={() => alternar(clave)}
                    aria-expanded={abierta} aria-label={abierta ? 'Ocultar líneas' : 'Ver líneas'}>
                    {abierta ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                </td>
                <td className="num muted tnum col-no">{(data?.meta.from ?? 1) + i}</td>
                <td className="tnum">{fmtFecha(ev.fecha)}</td>
                <td className="col-id">
                  <button type="button" className="link-btn" onClick={() => setVerVenta(ev.venta_id)}>
                    {ev.numero_venta}
                  </button>
                  {ev.origen === 'abono' && (
                    // Sin el % cobrado, los importes proporcionales parecen errores
                    <span className="badge" data-tone="warn" style={{ marginLeft: 6 }}
                      title="Abono de crédito: los importes son la fracción cobrada de la venta">
                      Abono {pct(ev.ratio * 100)}
                    </span>
                  )}
                  {sinCosto && (
                    <span title="Tiene líneas sin costo registrado" style={{ marginLeft: 6, color: 'var(--warn)' }}>⚠</span>
                  )}
                </td>
                <td className="muted">{ev.cliente}</td>
                <td className="muted">{ev.sucursal}</td>
                <td className="muted">{ev.vendedor}</td>
                <td className="num tnum">{q(ev.ingreso)}</td>
                <td className="num tnum muted">{q(ev.costo)}</td>
                <td className="num tnum" style={{ fontWeight: 600, color: ev.ganancia >= 0 ? 'var(--pos)' : 'var(--neg)' }}>
                  {q(ev.ganancia)}
                </td>
                <td className="num tnum">{pct(margenDe(ev))}</td>
              </tr>,
              abierta && <FilaLineas key={`${clave}-lineas`} evento={ev} />,
            ]
          })}
        </tbody>
      </table>

      <DetalleVenta open={verVenta !== null} onClose={() => setVerVenta(null)} ventaId={verVenta} />
    </DetalleShell>
  )
}

/** Desglose por línea de un evento: de dónde sale exactamente su ganancia. */
function FilaLineas({ evento }: { evento: GananciaEvento }) {
  return (
    <tr className="fila-lineas">
      <td colSpan={11}>
        <div className="lineas-caja">
          <div className="lineas-head">
            <span>Desglose de {evento.numero_venta}</span>
            <span className="muted">
              {METODO_LABEL[evento.metodo as keyof typeof METODO_LABEL] ?? evento.metodo ?? '—'}
              {evento.origen === 'abono' && ` · se cobró el ${pct(evento.ratio * 100)} de la venta`}
            </span>
          </div>
          <table className="tbl tbl-anidada">
            <thead>
              <tr>
                <th>Item</th>
                <th>Tipo</th>
                <th className="num">Unidades</th>
                <th className="num">Precio c/u</th>
                <th className="num">Costo c/u</th>
                <th className="num">Ingreso</th>
                <th className="num">Costo</th>
                <th className="num">Ganancia</th>
                <th className="num">Margen</th>
              </tr>
            </thead>
            <tbody>
              {evento.items.map((l) => {
                const ganancia = l.ingreso - l.costo
                const margen = l.ingreso > 0 ? (ganancia / l.ingreso) * 100 : 0
                return (
                  <tr key={l.detalle_id}>
                    <td style={{ fontWeight: 500 }}>
                      {l.nombre}
                      {!l.tiene_costo && (
                        <span className="muted" title="Sin costo registrado: cuenta como 100% de ganancia"> ⚠</span>
                      )}
                    </td>
                    <td className="muted" style={{ textTransform: 'capitalize' }}>{l.tipo}</td>
                    <td className="num tnum">{fmtN(l.unidades)}</td>
                    <td className="num tnum muted">{q(l.precio_unitario)}</td>
                    <td className="num tnum muted">{l.tiene_costo ? q(l.costo_unitario) : '—'}</td>
                    <td className="num tnum">{q(l.ingreso)}</td>
                    <td className="num tnum muted">{q(l.costo)}</td>
                    <td className="num tnum" style={{ fontWeight: 600, color: ganancia >= 0 ? 'var(--pos)' : 'var(--neg)' }}>
                      {q(ganancia)}
                    </td>
                    <td className="num tnum">{pct(margen)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </td>
    </tr>
  )
}
