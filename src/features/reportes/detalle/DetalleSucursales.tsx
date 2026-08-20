import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import {
  Building2, ChevronDown, ChevronRight, CircleDollarSign, Clock, HandCoins, Info, Receipt, Wallet,
} from 'lucide-react'
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
import type { SucursalDetalleFila, TopDeSucursal } from '@/types/reporte'

/**
 * Detalle de sucursales con los tres criterios juntos.
 *
 * Facturado y cobrado no coinciden porque responden preguntas distintas: una
 * venta a crédito se factura el día de la entrega y se cobra conforme el cliente
 * abona. Verlos lado a lado, con la cartera pendiente, evita que la diferencia
 * parezca un error de cuadre.
 */
export function DetalleSucursales() {
  const rango = rangoPorDefecto()
  const { filtros, setFiltros } = useFiltrosUrl({ desde: rango.desde, hasta: rango.hasta })

  const desde = filtros.desde ?? rango.desde
  const hasta = filtros.hasta ?? rango.hasta

  const [texto, setTexto] = useBusquedaUrl(filtros, setFiltros)
  const [expandidas, setExpandidas] = useState<Set<number | string>>(new Set())
  const cambiar = (patch: Record<string, string>) => setFiltros(patch)

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['rep-sucursales-detalle', filtros],
    queryFn: () => reportesApi.sucursalesDetalle({ ...aParams(filtros), fecha_inicio: desde, fecha_fin: hasta }),
    placeholderData: keepPreviousData,
  })

  const sucursales = data?.data ?? []
  const r = data?.resumen
  const desglose = data?.desglose

  const kpis: KpiItem[] = r ? [
    { label: 'Sucursales', value: r.sucursales, icon: Building2, tone: 'accent' },
    { label: 'Transacciones', value: r.transacciones, icon: Receipt, tone: 'info' },
    { label: 'Facturado', value: q(r.facturado), icon: Wallet, tone: 'violet', sub: 'ventas del periodo' },
    { label: 'Cobrado', value: q(r.cobrado), icon: HandCoins, tone: 'pos', sub: 'dinero que entró' },
    // Cartera viva: es el saldo de hoy, no algo acotado al rango
    { label: 'Por cobrar', value: q(r.por_cobrar), icon: Clock, tone: r.por_cobrar > 0 ? 'warn' : 'pos', sub: 'cartera de hoy' },
    { label: 'Ganancia', value: q(r.ganancia), icon: CircleDollarSign, tone: 'pos', sub: `margen ${pct(r.margen_porcentaje)}` },
  ] : []

  const exportData: ReporteExportData | null = useMemo(() => r ? {
    titulo: 'Detalle de sucursales',
    rango: `Del ${fmtFecha(desde)} al ${fmtFecha(hasta)}`,
    kpis: [
      { label: 'Sucursales', value: fmtN(r.sucursales) }, { label: 'Facturado', value: q(r.facturado) },
      { label: 'Cobrado', value: q(r.cobrado) }, { label: 'Por cobrar', value: q(r.por_cobrar) },
      { label: 'Ganancia', value: q(r.ganancia) },
    ],
    tablas: [{
      titulo: 'Facturado, cobrado y cartera por sucursal',
      columnas: [{ label: 'Sucursal' }, { label: 'Ventas', align: 'right' },
        { label: 'Facturado', align: 'right' }, { label: 'Cobrado', align: 'right' },
        { label: 'Por cobrar', align: 'right' }, { label: 'Ganancia', align: 'right' },
        { label: 'Margen', align: 'right' }],
      filas: sucursales.map((s) => [
        s.nombre, fmtN(s.transacciones), q(s.facturado), q(s.cobrado), q(s.por_cobrar),
        q(s.ganancia), pct(s.margen_porcentaje),
      ]),
    }],
  } : null, [r, sucursales, desde, hasta])

  const alternar = (id: number | string) => setExpandidas((prev) => {
    const siguiente = new Set(prev)
    siguiente.has(id) ? siguiente.delete(id) : siguiente.add(id)
    return siguiente
  })

  return (
    <DetalleShell
      titulo="Detalle de sucursales"
      subtitulo="Facturado, cobrado y cartera pendiente, lado a lado"
      volverA="/reportes"
      cargandoFondo={isFetching}
      acciones={<BotonesExportar data={exportData} />}
      filtros={(
        <div className="toolbar">
          <BuscadorToolbar placeholder="Buscar por nombre, dirección o teléfono…"
            value={texto} onChange={setTexto} cargando={isFetching} />
          <RangoFechas desde={desde} hasta={hasta} onChange={(nuevo) => cambiar(nuevo)} />
          <Select value={filtros.estado ?? 'todos'} onValueChange={(v) => cambiar({ estado: v === 'todos' ? '' : v })} ariaLabel="Estado"
            options={[
              { value: 'todos', label: 'Activas e inactivas' },
              { value: 'activo', label: 'Solo activas' },
              { value: 'inactivo', label: 'Solo inactivas' },
            ]} />
          <Select value={filtros.sort ?? 'facturado_desc'} onValueChange={(v) => cambiar({ sort: v })} ariaLabel="Orden"
            options={[
              { value: 'facturado_desc', label: 'Mayor facturado' },
              { value: 'ganancia_desc', label: 'Mayor ganancia' },
              { value: 'margen_desc', label: 'Mayor margen' },
              { value: 'ticket_desc', label: 'Mayor ticket' },
              { value: 'transacciones_desc', label: 'Más ventas' },
              { value: 'nombre', label: 'Nombre' },
            ]} />
          <Select value={filtros.incluir_sin_ventas ?? '0'} onValueChange={(v) => cambiar({ incluir_sin_ventas: v === '0' ? '' : v })} ariaLabel="Sin ventas"
            options={[
              { value: '0', label: 'Solo con actividad' },
              { value: '1', label: 'Incluir sin ventas' },
            ]} />
        </div>
      )}
      kpis={kpis}
      isLoading={isLoading}
      isError={isError}
      vacio={sucursales.length === 0}
      refetch={refetch}
    >
      <table className="tbl">
        <thead>
          <tr>
            <th style={{ width: 34 }} />
            <th className="col-id">Sucursal</th>
            <th className="num">Ventas</th>
            <th className="num" title="Suma de las ventas completadas del periodo, incluidas las de crédito aún no cobradas">Facturado</th>
            <th className="num" title="Dinero que entró: contado del periodo más los abonos de crédito cobrados en él">Cobrado</th>
            <th className="num" title="Saldo de crédito pendiente al día de hoy, sin importar el periodo">Por cobrar</th>
            <th className="num">Ticket</th>
            <th className="num">Ganancia</th>
            <th className="num">Margen</th>
          </tr>
        </thead>
        <tbody>
          {sucursales.map((s) => {
            // La fila de lo no atribuible no tiene id; se agrupa bajo una clave fija
            const clave = s.id ?? 'sin'
            const abierta = expandidas.has(clave)
            return [
              <tr key={clave} data-abierta={abierta || undefined} data-huerfana={s.sin_sucursal || undefined}>
                <td>
                  <button type="button" className="icon-btn" onClick={() => alternar(clave)}
                    aria-expanded={abierta} aria-label={abierta ? 'Ocultar desglose' : 'Ver desglose'}>
                    {abierta ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                </td>
                <td className="col-id">
                  {s.sin_sucursal ? (
                    <>
                      <span style={{ fontWeight: 500 }}>{s.nombre}</span>
                      <div className="muted" style={{ fontSize: 11 }}>
                        <Info size={10} style={{ verticalAlign: -1, marginRight: 3 }} />
                        anterior a las sucursales y créditos manuales
                      </div>
                    </>
                  ) : (
                    <>
                      <Link to={`/sucursales/${s.id}`} style={{ fontWeight: 500 }}>{s.nombre}</Link>
                      <div className="muted" style={{ fontSize: 11 }}>
                        {fmtN(s.usuarios_count)} {s.usuarios_count === 1 ? 'usuario' : 'usuarios'}
                        {s.estado !== 'activo' && <span style={{ color: 'var(--warn)' }}> · inactiva</span>}
                      </div>
                    </>
                  )}
                </td>
                <td className="num tnum">{fmtN(s.transacciones)}</td>
                <td className="num tnum" style={{ fontWeight: 600 }}>{q(s.facturado)}</td>
                <td className="num tnum" style={{ fontWeight: 600, color: 'var(--pos)' }}>{q(s.cobrado)}</td>
                <td className="num tnum" style={s.por_cobrar > 0 ? { color: 'var(--warn)', fontWeight: 600 } : { color: 'var(--text-faint)' }}>
                  {s.por_cobrar > 0 ? q(s.por_cobrar) : '—'}
                  {s.creditos_abiertos > 0 && (
                    <div className="muted" style={{ fontSize: 10, fontWeight: 400 }}>
                      {fmtN(s.creditos_abiertos)} {s.creditos_abiertos === 1 ? 'crédito' : 'créditos'}
                    </div>
                  )}
                </td>
                <td className="num tnum muted">{q(s.ticket_promedio)}</td>
                <td className="num tnum" style={{ fontWeight: 600, color: s.ganancia >= 0 ? 'var(--pos)' : 'var(--neg)' }}>
                  {q(s.ganancia)}
                </td>
                <td className="num tnum">
                  <span style={{ color: s.margen_porcentaje >= 30 ? 'var(--pos)' : s.margen_porcentaje >= 15 ? 'var(--warn)' : 'var(--neg)' }}>
                    {pct(s.margen_porcentaje)}
                  </span>
                </td>
              </tr>,
              abierta && (
                <FilaDesglose key={`${clave}-desglose`} sucursal={s}
                  vendedores={desglose?.vendedores[clave] ?? []}
                  productos={desglose?.productos[clave] ?? []}
                  desde={desde} hasta={hasta} />
              ),
            ]
          })}
        </tbody>
      </table>
    </DetalleShell>
  )
}

/** Quién vende y qué se vende en esa sucursal. */
function FilaDesglose({ sucursal, vendedores, productos, desde, hasta }: {
  sucursal: SucursalDetalleFila
  vendedores: TopDeSucursal[]
  productos: TopDeSucursal[]
  desde: string
  hasta: string
}) {
  return (
    <tr className="fila-lineas">
      <td colSpan={9}>
        <div className="lineas-caja">
          <div className="lineas-head">
            <span>Desglose de {sucursal.nombre}</span>
            <span className="muted">
              {fmtN(sucursal.unidades_producto)} unidades de producto · {fmtN(sucursal.unidades_servicio)} de servicio
              {sucursal.descuentos > 0 && ` · ${q(sucursal.descuentos)} en descuentos`}
            </span>
          </div>

          {/* Qué compone exactamente esta fila: son dos orígenes distintos y
              conviene que se vea, porque ninguno se puede corregir sin inventar datos */}
          {sucursal.sin_sucursal && (
            <div className="aviso-huerfana">
              <Info size={13} />
              <div>
                Ventas registradas antes de que el sistema tuviera sucursales, más los créditos
                que se registran a mano y no nacen de una venta. No se les puede asignar sucursal
                sin inventar el dato, así que se agrupan aquí para que los totales cuadren.
                <div style={{ marginTop: 4 }}>
                  Cartera: <strong>{q(sucursal.cartera_sin_venta ?? 0)}</strong> en{' '}
                  {fmtN(sucursal.creditos_sin_venta ?? 0)} créditos sin venta asociada
                  {(sucursal.cartera_venta_sin_suc ?? 0) > 0 && (
                    <> · <strong>{q(sucursal.cartera_venta_sin_suc ?? 0)}</strong> de ventas sin sucursal</>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="desglose-cols">
            <TopLista titulo="Vendedores" filas={vendedores} etiqueta="ventas"
              vacio="Sin ventas en el periodo" />
            <TopLista titulo="Productos más vendidos" filas={productos} etiqueta="unid."
              vacio="Sin productos vendidos" />
          </div>

          {/* Sin id no hay filtro por sucursal al que enlazar */}
          {sucursal.id !== null && (
            <div style={{ marginTop: 10, fontSize: 11.5 }}>
              <Link to={`/reportes/detalle/ventas?desde=${desde}&hasta=${hasta}&sucursal_id=${sucursal.id}`}>
                Ver todas las líneas de venta de esta sucursal
              </Link>
            </div>
          )}
        </div>
      </td>
    </tr>
  )
}

function TopLista({ titulo, filas, etiqueta, vacio }: {
  titulo: string; filas: TopDeSucursal[]; etiqueta: string; vacio: string
}) {
  const maximo = Math.max(1, ...filas.map((f) => f.total))

  return (
    <div>
      <div className="desglose-titulo">{titulo}</div>
      {filas.length === 0 ? (
        <div className="muted" style={{ fontSize: 12 }}>{vacio}</div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {filas.map((f, i) => (
            <div key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12 }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {f.nombre ?? '—'}
                </span>
                <span className="tnum" style={{ fontWeight: 600, flexShrink: 0 }}>{q(f.total)}</span>
              </div>
              <div className="barrow-track" style={{ height: 5, marginTop: 3 }}>
                <span style={{ width: `${(f.total / maximo) * 100}%`, background: 'var(--accent)' }} />
              </div>
              <div className="muted" style={{ fontSize: 10.5, marginTop: 2 }}>{fmtN(f.veces)} {etiqueta}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
