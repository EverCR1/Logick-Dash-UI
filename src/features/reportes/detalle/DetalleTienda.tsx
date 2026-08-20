import { useMemo, useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import {
  Boxes, CircleDollarSign, Layers, Percent, SlidersHorizontal, Store, Truck, Wallet, X,
} from 'lucide-react'
import type { KpiItem } from '@/components/ui/KpiGrid'
import { Select } from '@/components/ui/Select'
import { BuscadorToolbar } from '@/components/ui/BuscadorToolbar'
import { RangoFechas, rangoPorDefecto } from '@/components/ui/RangoFechas'
import { RangoNumerico } from '@/components/ui/RangoNumerico'
import { reportesApi } from '@/lib/api'
import { fmtFecha, fmtN, pct, q } from '@/lib/format'
import { ESTADO_PEDIDO, ESTADO_OPCIONES } from '../../pedidos/pedido-estados'
import { DetallePedido } from '../../pedidos/DetallePedido'
import { BotonesExportar } from '../BotonesExportar'
import type { ReporteExportData } from '../ReportePDF'
import { DetalleShell } from './DetalleShell'
import { ChipItem, useBusquedaUrl } from './detalle-comunes'
import { aParams, useFiltrosUrl } from './useFiltrosUrl'
import type { PedidoEstado } from '@/types/pedido'
import type { PedidoLinea } from '@/types/reporte'

const POR_PAGINA = 20

const AVANZADOS = ['estado', 'metodo_pago', 'tipo_entrega', 'sucursal_id', 'con_cupon',
  'monto_min', 'monto_max'] as const

const METODOS_TIENDA = [
  { value: 'todos', label: 'Todos los métodos' },
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'deposito_transferencia', label: 'Depósito / transferencia' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'mixto', label: 'Mixto' },
]

/**
 * Detalle de la tienda a nivel de línea: una fila por producto pedido.
 *
 * Añade lo que el resumen de pedidos no muestra: entrega, sucursal de recogida,
 * cupón y la ganancia estimada de cada línea.
 */
export function DetalleTienda() {
  const rango = rangoPorDefecto()
  const { filtros, setFiltros, limpiar } = useFiltrosUrl({ desde: rango.desde, hasta: rango.hasta })

  const desde = filtros.desde ?? rango.desde
  const hasta = filtros.hasta ?? rango.hasta
  const page = Number(filtros.page ?? 1)

  const [panelAbierto, setPanelAbierto] = useState(false)
  const [verPedido, setVerPedido] = useState<number | null>(null)
  const [texto, setTexto] = useBusquedaUrl(filtros, setFiltros)

  const cambiar = (patch: Record<string, string>) => setFiltros({ ...patch, page: '' })

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['rep-tienda-lineas', filtros],
    queryFn: () => reportesApi.tiendaLineas({
      ...aParams(filtros), fecha_inicio: desde, fecha_fin: hasta, per_page: POR_PAGINA,
    }),
    placeholderData: keepPreviousData,
  })

  const lineas = data?.data ?? []
  const r = data?.resumen
  const cat = data?.catalogos

  // La ganancia solo se conoce de la página visible: se deriva línea a línea y no
  // hay una suma agregada en el servidor, así que se rotula como tal.
  const gananciaPagina = lineas.reduce((s, l) => s + l.ganancia, 0)
  const margenPagina = lineas.reduce((s, l) => s + l.subtotal, 0)

  const avanzadosActivos = AVANZADOS.filter((k) => filtros[k]).length
  const totalActivos = avanzadosActivos + (filtros.search ? 1 : 0) + (filtros.producto_id ? 1 : 0)

  const kpis: KpiItem[] = r ? [
    { label: 'Líneas', value: r.lineas, icon: Layers, tone: 'accent', sub: 'productos pedidos' },
    { label: 'Unidades', value: r.unidades, icon: Boxes, tone: 'info' },
    { label: 'Subtotal', value: q(r.subtotal), icon: Wallet, tone: 'pos', sub: 'sin envío' },
    { label: 'Ganancia', value: q(gananciaPagina), icon: CircleDollarSign, tone: 'violet', sub: 'en esta página' },
    {
      label: 'Margen', value: pct(margenPagina > 0 ? (gananciaPagina / margenPagina) * 100 : 0),
      icon: Percent, tone: 'warn', sub: 'en esta página',
    },
  ] : []

  const exportData: ReporteExportData | null = useMemo(() => r ? {
    titulo: 'Detalle de pedidos de la tienda',
    rango: `Del ${fmtFecha(desde)} al ${fmtFecha(hasta)}`,
    kpis: [
      { label: 'Líneas', value: fmtN(r.lineas) }, { label: 'Unidades', value: fmtN(r.unidades) },
      { label: 'Subtotal', value: q(r.subtotal) },
    ],
    tablas: [{
      titulo: 'Líneas de pedido',
      columnas: [{ label: 'Fecha' }, { label: 'Pedido' }, { label: 'Producto' }, { label: 'Cliente' },
        { label: 'Entrega' }, { label: 'Cant.', align: 'right' }, { label: 'Subtotal', align: 'right' },
        { label: 'Ganancia', align: 'right' }],
      filas: lineas.map((l) => [
        fmtFecha(l.pedido?.created_at), l.pedido?.numero_pedido ?? '—',
        l.producto?.nombre_completo || l.nombre_producto, l.pedido?.nombre ?? '—',
        l.pedido?.tipo_entrega === 'tienda' ? 'Recoge en tienda' : 'Domicilio',
        fmtN(l.cantidad), q(l.subtotal), l.tiene_costo ? q(l.ganancia) : '—',
      ]),
    }],
  } : null, [r, lineas, desde, hasta])

  return (
    <DetalleShell
      titulo="Detalle de la tienda"
      subtitulo="Una fila por producto pedido, con entrega, cupón y ganancia estimada"
      volverA="/reportes"
      anchoTabla={1020}
      cargandoFondo={isFetching}
      acciones={<BotonesExportar data={exportData} />}
      filtros={(
        <>
          <div className="toolbar">
            <BuscadorToolbar placeholder="Buscar por producto, SKU, N° pedido o cliente…"
              value={texto} onChange={setTexto} cargando={isFetching} />
            <RangoFechas desde={desde} hasta={hasta} onChange={(nuevo) => cambiar(nuevo)} />
            <Select value={filtros.sort ?? 'fecha_desc'} onValueChange={(v) => cambiar({ sort: v })} ariaLabel="Orden"
              options={[
                { value: 'fecha_desc', label: 'Más recientes' },
                { value: 'fecha_asc', label: 'Más antiguos' },
                { value: 'total_desc', label: 'Mayor subtotal' },
                { value: 'total_asc', label: 'Menor subtotal' },
                { value: 'cantidad_desc', label: 'Mayor cantidad' },
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

          <ChipItem item={data?.filtro_item ?? null} onQuitar={() => cambiar({ producto_id: '' })} />

          {panelAbierto && (
            <div className="filtros-panel">
              <Select value={filtros.estado ?? 'todos'} onValueChange={(v) => cambiar({ estado: v === 'todos' ? '' : v })} ariaLabel="Estado del pedido"
                options={[{ value: 'todos', label: 'Todos los estados' }, ...ESTADO_OPCIONES]} />
              <Select value={filtros.tipo_entrega ?? 'todos'} onValueChange={(v) => cambiar({ tipo_entrega: v === 'todos' ? '' : v })} ariaLabel="Tipo de entrega"
                options={[
                  { value: 'todos', label: 'Toda entrega' },
                  { value: 'domicilio', label: 'Envío a domicilio' },
                  { value: 'tienda', label: 'Recoge en tienda' },
                ]} />
              <Select value={filtros.sucursal_id ?? 'todos'} onValueChange={(v) => cambiar({ sucursal_id: v === 'todos' ? '' : v })} ariaLabel="Sucursal de recogida"
                options={[{ value: 'todos', label: 'Todas las sucursales' }, ...(cat?.sucursales ?? []).map((s) => ({ value: String(s.id), label: s.nombre }))]} />
              <Select value={filtros.metodo_pago ?? 'todos'} onValueChange={(v) => cambiar({ metodo_pago: v === 'todos' ? '' : v })}
                ariaLabel="Método de pago" options={METODOS_TIENDA} />
              <Select value={filtros.con_cupon ?? 'todos'} onValueChange={(v) => cambiar({ con_cupon: v === 'todos' ? '' : v })} ariaLabel="Cupón"
                options={[
                  { value: 'todos', label: 'Con y sin cupón' },
                  { value: '1', label: 'Solo con cupón' },
                  { value: '0', label: 'Solo sin cupón' },
                ]} />
              <RangoNumerico prefijo="Q" etiqueta="Subtotal línea" step={1}
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
            <th>Pedido</th>
            <th className="col-id">Producto</th>
            <th>Cliente</th>
            <th>Entrega</th>
            <th style={{ width: 110 }}>Estado</th>
            <th className="num">Cant.</th>
            <th className="num">Subtotal</th>
            <th className="num">Ganancia</th>
          </tr>
        </thead>
        <tbody>
          {lineas.map((l, i) => (
            <FilaPedido key={l.id} linea={l} numero={(data?.meta.from ?? 1) + i} onVer={setVerPedido} />
          ))}
        </tbody>
      </table>

      <DetallePedido open={verPedido !== null} onClose={() => setVerPedido(null)} pedidoId={verPedido} />
    </DetalleShell>
  )
}

function FilaPedido({ linea: l, numero, onVer }: {
  linea: PedidoLinea; numero: number; onVer: (id: number) => void
}) {
  const badge = ESTADO_PEDIDO[l.pedido?.estado as PedidoEstado]
  const enTienda = l.pedido?.tipo_entrega === 'tienda'

  return (
    <tr>
      <td className="num muted tnum col-no">{numero}</td>
      <td className="tnum">{fmtFecha(l.pedido?.created_at)}</td>
      <td>
        {l.pedido && (
          <button type="button" className="link-btn" onClick={() => onVer(l.pedido!.id)}>
            {l.pedido.numero_pedido}
          </button>
        )}
        {l.pedido?.cupon && (
          <div className="muted" style={{ fontSize: 11 }}>Cupón {l.pedido.cupon.codigo}</div>
        )}
      </td>
      <td className="col-id">
        {/* El nombre del catálogo gana al congelado en la línea, que puede
            haber quedado obsoleto tras renombrar el producto */}
        <div style={{ fontWeight: 500 }}>{l.producto?.nombre_completo || l.nombre_producto}</div>
        {l.producto?.sku && <div className="muted" style={{ fontSize: 11 }}>{l.producto.sku}</div>}
      </td>
      <td className="muted">{l.pedido?.nombre ?? '—'}</td>
      <td className="muted" style={{ fontSize: 12 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          {enTienda ? <Store size={13} /> : <Truck size={13} />}
          {enTienda ? (l.pedido?.sucursal?.nombre ?? 'En tienda') : 'Domicilio'}
        </span>
      </td>
      <td>{badge && <span className="badge" data-tone={badge.tone}><span className="b-dot" />{badge.label}</span>}</td>
      <td className="num tnum">{fmtN(l.cantidad)}</td>
      <td className="num tnum" style={{ fontWeight: 600 }}>{q(l.subtotal)}</td>
      <td className="num tnum" style={{ color: l.tiene_costo ? 'var(--pos)' : 'var(--text-faint)' }}>
        {l.tiene_costo ? q(l.ganancia) : (
          <span title="El producto ya no existe: no se puede calcular el costo">—</span>
        )}
      </td>
    </tr>
  )
}
