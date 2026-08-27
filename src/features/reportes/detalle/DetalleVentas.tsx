import { useMemo, useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { Boxes, Layers, Receipt, Scissors, SlidersHorizontal, Wallet, X } from 'lucide-react'
import type { KpiItem } from '@/components/ui/KpiGrid'
import { Select } from '@/components/ui/Select'
import { BuscadorToolbar } from '@/components/ui/BuscadorToolbar'
import { RangoFechas, rangoPorDefecto } from '@/components/ui/RangoFechas'
import { RangoNumerico } from '@/components/ui/RangoNumerico'
import { reportesApi } from '@/lib/api'
import { fmtFecha, fmtN, q } from '@/lib/format'
import { ESTADO_VENTA, METODO_LABEL } from '../../ventas/venta-estados'
import { DetalleVenta } from '../../ventas/DetalleVenta'
import { BotonesExportar } from '../BotonesExportar'
import type { ReporteExportData } from '../ReportePDF'
import { DetalleShell } from './DetalleShell'
import { ChipItem, OPCIONES_METODO, useBusquedaUrl } from './detalle-comunes'
import { aParams, useFiltrosUrl } from './useFiltrosUrl'
import type { VentaLinea } from '@/types/reporte'

const POR_PAGINA = 20

const AVANZADOS = ['cliente_id', 'vendedor_id', 'sucursal_id', 'metodo_pago', 'estado',
  'con_descuento', 'monto_min', 'monto_max'] as const

/** El nombre del catálogo gana a la descripción congelada en la línea. */
function nombreDeLinea(l: VentaLinea): string {
  return l.producto?.nombre_completo || l.servicio?.nombre || l.descripcion || '—'
}

/**
 * Detalle de ventas a nivel de línea: una fila por ítem vendido, no por venta.
 *
 * Es lo que el resumen no deja ver — "todas las líneas del producto X en marzo
 * con descuento" es una pregunta sobre ítems, no sobre ventas.
 */
export function DetalleVentas() {
  const rango = rangoPorDefecto()
  const { filtros, setFiltros, limpiar } = useFiltrosUrl({ desde: rango.desde, hasta: rango.hasta })

  const desde = filtros.desde ?? rango.desde
  const hasta = filtros.hasta ?? rango.hasta
  const page = Number(filtros.page ?? 1)

  const [panelAbierto, setPanelAbierto] = useState(false)
  const [verVenta, setVerVenta] = useState<number | null>(null)
  const [texto, setTexto] = useBusquedaUrl(filtros, setFiltros)

  const cambiar = (patch: Record<string, string>) => setFiltros({ ...patch, page: '' })

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['rep-ventas-lineas', filtros],
    queryFn: () => reportesApi.ventasLineas({
      ...aParams(filtros), fecha_inicio: desde, fecha_fin: hasta, per_page: POR_PAGINA,
    }),
    placeholderData: keepPreviousData,
  })

  const lineas = data?.data ?? []
  const r = data?.resumen
  const cat = data?.catalogos

  const avanzadosActivos = AVANZADOS.filter((k) => filtros[k]).length
  const totalActivos = avanzadosActivos + (filtros.search ? 1 : 0) + (filtros.tipo ? 1 : 0)
    + (filtros.producto_id || filtros.servicio_id ? 1 : 0)

  const kpis: KpiItem[] = r ? [
    { label: 'Líneas', value: r.lineas, icon: Layers, tone: 'accent', sub: 'ítems vendidos' },
    { label: 'Unidades', value: r.unidades, icon: Boxes, tone: 'info' },
    { label: 'Subtotal', value: q(r.subtotal), icon: Receipt, tone: 'violet', sub: 'antes de descuento' },
    // Los descuentos por línea no aparecen en ningún otro reporte
    {
      label: 'Descuentos', value: q(r.descuentos), icon: Scissors, tone: 'warn', sub: 'otorgados',
      onClick: () => cambiar({ con_descuento: filtros.con_descuento === '1' ? '' : '1' }),
      activo: filtros.con_descuento === '1',
    },
    { label: 'Total', value: q(r.total), icon: Wallet, tone: 'pos', sub: 'facturado' },
  ] : []

  const exportData: ReporteExportData | null = useMemo(() => r ? {
    titulo: 'Detalle de ventas por línea',
    rango: `Del ${fmtFecha(desde)} al ${fmtFecha(hasta)}`,
    kpis: [
      { label: 'Líneas', value: fmtN(r.lineas) }, { label: 'Unidades', value: fmtN(r.unidades) },
      { label: 'Subtotal', value: q(r.subtotal) }, { label: 'Descuentos', value: q(r.descuentos) },
      { label: 'Total', value: q(r.total) },
    ],
    tablas: [{
      titulo: 'Líneas de venta',
      columnas: [{ label: 'Fecha' }, { label: 'Venta' }, { label: 'Item' }, { label: 'Cliente' },
        { label: 'Cant.', align: 'right' }, { label: 'P. unit.', align: 'right' },
        { label: 'Dcto.', align: 'right' }, { label: 'Total', align: 'right' }],
      filas: lineas.map((l) => [
        fmtFecha(l.venta?.created_at), l.venta?.numero_venta ?? '—', nombreDeLinea(l),
        l.venta?.cliente?.nombre ?? 'Consumidor final', fmtN(l.cantidad),
        q(Number(l.precio_unitario)), q(Number(l.descuento)), q(Number(l.total)),
      ]),
    }],
  } : null, [r, lineas, desde, hasta])

  return (
    <DetalleShell
      titulo="Detalle de ventas"
      subtitulo="Una fila por ítem vendido, no por venta"
      volverA="/reportes"
      anchoTabla={1080}
      cargandoFondo={isFetching}
      acciones={<BotonesExportar data={exportData} />}
      filtros={(
        <>
          <div className="toolbar">
            <BuscadorToolbar placeholder="Buscar por producto, SKU, N° venta o cliente…"
              value={texto} onChange={setTexto} cargando={isFetching} />
            <RangoFechas desde={desde} hasta={hasta} onChange={(nuevo) => cambiar(nuevo)} />
            <Select value={filtros.tipo ?? 'todos'} onValueChange={(v) => cambiar({ tipo: v === 'todos' ? '' : v })} ariaLabel="Tipo"
              options={[
                { value: 'todos', label: 'Todos los ítems' },
                { value: 'producto', label: 'Solo productos' },
                { value: 'servicio', label: 'Solo servicios' },
                { value: 'manual', label: 'Solo líneas manuales' },
              ]} />
            <Select value={filtros.sort ?? 'fecha_desc'} onValueChange={(v) => cambiar({ sort: v })} ariaLabel="Orden"
              options={[
                { value: 'fecha_desc', label: 'Más recientes' },
                { value: 'fecha_asc', label: 'Más antiguas' },
                { value: 'total_desc', label: 'Mayor total' },
                { value: 'total_asc', label: 'Menor total' },
                { value: 'cantidad_desc', label: 'Mayor cantidad' },
                { value: 'descuento_desc', label: 'Mayor descuento' },
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

          <ChipItem item={data?.filtro_item ?? null} onQuitar={() => cambiar({ producto_id: '', servicio_id: '' })} />

          {panelAbierto && (
            <div className="filtros-panel">
              <Select value={filtros.cliente_id ?? 'todos'} onValueChange={(v) => cambiar({ cliente_id: v === 'todos' ? '' : v })} ariaLabel="Cliente"
                options={[{ value: 'todos', label: 'Todos los clientes' }, ...(cat?.clientes ?? []).map((c) => ({ value: String(c.id), label: c.nombre }))]} />
              <Select value={filtros.vendedor_id ?? 'todos'} onValueChange={(v) => cambiar({ vendedor_id: v === 'todos' ? '' : v })} ariaLabel="Vendedor"
                options={[{ value: 'todos', label: 'Todos los vendedores' }, ...(cat?.vendedores ?? []).map((v) => ({ value: String(v.id), label: v.nombre }))]} />
              <Select value={filtros.sucursal_id ?? 'todos'} onValueChange={(v) => cambiar({ sucursal_id: v === 'todos' ? '' : v })} ariaLabel="Sucursal"
                options={[{ value: 'todos', label: 'Todas las sucursales' }, ...(cat?.sucursales ?? []).map((s) => ({ value: String(s.id), label: s.nombre }))]} />
              <Select value={filtros.estado ?? 'todos'} onValueChange={(v) => cambiar({ estado: v === 'todos' ? '' : v })} ariaLabel="Estado de la venta"
                options={[
                  { value: 'todos', label: 'Todos los estados' },
                  { value: 'completada', label: 'Completadas' },
                  { value: 'pendiente', label: 'Pendientes' },
                  { value: 'cancelada', label: 'Canceladas' },
                ]} />
              <Select value={filtros.metodo_pago ?? 'todos'} onValueChange={(v) => cambiar({ metodo_pago: v === 'todos' ? '' : v })}
                ariaLabel="Método de pago" options={OPCIONES_METODO} />
              <Select value={filtros.con_descuento ?? 'todos'} onValueChange={(v) => cambiar({ con_descuento: v === 'todos' ? '' : v })} ariaLabel="Descuento"
                options={[
                  { value: 'todos', label: 'Con y sin descuento' },
                  { value: '1', label: 'Solo con descuento' },
                  { value: '0', label: 'Solo sin descuento' },
                ]} />
              <RangoNumerico prefijo="Q" etiqueta="Total línea" step={1}
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
      vacio={lineas.length === 0}
      refetch={refetch}
      meta={data?.meta}
      page={page}
      setPage={(actualizar) => setFiltros({ page: String(actualizar(page)) })}
    >
      <table className="tbl">
        <thead>
          <tr>
            <th className="num col-no" style={{ width: 44 }}>No.</th>
            <th style={{ width: 100 }}>Fecha</th>
            <th>Venta</th>
            <th className="col-id">Item</th>
            <th>Cliente</th>
            <th>Vendedor</th>
            <th style={{ width: 100 }}>Estado</th>
            <th className="num">Cant.</th>
            <th className="num">P. unit.</th>
            <th className="num">Dcto.</th>
            <th className="num">Total</th>
          </tr>
        </thead>
        <tbody>
          {lineas.map((l, i) => {
            const badge = ESTADO_VENTA[l.venta?.estado as keyof typeof ESTADO_VENTA]
            const descuento = Number(l.descuento)
            return (
              <tr key={l.id}>
                <td className="num muted tnum col-no">{(data?.meta.from ?? 1) + i}</td>
                <td className="tnum">{fmtFecha(l.venta?.created_at)}</td>
                <td>
                  {l.venta && (
                    <button type="button" className="link-btn" onClick={() => setVerVenta(l.venta!.id)}>
                      {l.venta.numero_venta}
                    </button>
                  )}
                  <div className="muted" style={{ fontSize: 11 }}>
                    {METODO_LABEL[l.venta?.metodo_pago as keyof typeof METODO_LABEL] ?? l.venta?.metodo_pago ?? '—'}
                  </div>
                </td>
                <td className="col-id">
                  <div style={{ fontWeight: 500 }}>{nombreDeLinea(l)}</div>
                  <div className="muted" style={{ fontSize: 11, textTransform: 'capitalize' }}>
                    {l.tipo}{l.producto?.sku ? ` · ${l.producto.sku}` : ''}
                  </div>
                </td>
                <td className="muted">{l.venta?.cliente?.nombre ?? 'Consumidor final'}</td>
                <td className="muted">
                  {l.venta?.vendedor ? `${l.venta.vendedor.nombres} ${l.venta.vendedor.apellidos}`.trim() : '—'}
                </td>
                <td>
                  {badge && <span className="badge" data-tone={badge.tone}><span className="b-dot" />{badge.label}</span>}
                </td>
                <td className="num tnum">{fmtN(l.cantidad)}</td>
                <td className="num tnum muted">{q(Number(l.precio_unitario))}</td>
                <td className="num tnum" style={descuento > 0 ? { color: 'var(--warn)', fontWeight: 600 } : undefined}>
                  {descuento > 0 ? q(descuento) : '—'}
                </td>
                <td className="num tnum" style={{ fontWeight: 600 }}>{q(Number(l.total))}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <DetalleVenta open={verVenta !== null} onClose={() => setVerVenta(null)} ventaId={verVenta} />
    </DetalleShell>
  )
}
