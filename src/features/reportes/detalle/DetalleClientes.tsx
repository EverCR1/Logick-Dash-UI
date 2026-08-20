import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import {
  CalendarClock, CreditCard, Receipt, ShoppingBag, SlidersHorizontal, UserMinus, Users, Wallet, X,
} from 'lucide-react'
import type { KpiItem } from '@/components/ui/KpiGrid'
import { Select } from '@/components/ui/Select'
import { BuscadorToolbar } from '@/components/ui/BuscadorToolbar'
import { RangoFechas, rangoPorDefecto } from '@/components/ui/RangoFechas'
import { RangoNumerico } from '@/components/ui/RangoNumerico'
import { reportesApi } from '@/lib/api'
import { fmtFecha, fmtN, q } from '@/lib/format'
import { BotonesExportar } from '../BotonesExportar'
import type { ReporteExportData } from '../ReportePDF'
import { DetalleShell } from './DetalleShell'
import { useBusquedaUrl } from './detalle-comunes'
import { aParams, useFiltrosUrl } from './useFiltrosUrl'
import type { ClienteDetalleFila } from '@/types/reporte'

const POR_PAGINA = 20

const AVANZADOS = ['tipo', 'estado', 'monto_min', 'monto_max', 'con_credito', 'sin_compras'] as const

/** A partir de aquí un cliente se considera en riesgo de haberse perdido. */
const DIAS_ALERTA = 90

/**
 * Detalle de clientes: quién compra, cuánto, cada cuánto y qué debe.
 *
 * El resumen es un top por monto. Aquí se añade la frecuencia, los días sin
 * comprar y el saldo de crédito, que es lo que separa un cliente activo de uno
 * que se está perdiendo.
 */
export function DetalleClientes() {
  const rango = rangoPorDefecto()
  const { filtros, setFiltros, limpiar } = useFiltrosUrl({ desde: rango.desde, hasta: rango.hasta })

  const desde = filtros.desde ?? rango.desde
  const hasta = filtros.hasta ?? rango.hasta
  const page = Number(filtros.page ?? 1)

  const [panelAbierto, setPanelAbierto] = useState(false)
  const [texto, setTexto] = useBusquedaUrl(filtros, setFiltros)

  const cambiar = (patch: Record<string, string>) => setFiltros({ ...patch, page: '' })

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['rep-clientes-detalle', filtros],
    queryFn: () => reportesApi.clientesDetalle({
      ...aParams(filtros), fecha_inicio: desde, fecha_fin: hasta, per_page: POR_PAGINA,
    }),
    placeholderData: keepPreviousData,
  })

  const clientes = data?.data ?? []
  const r = data?.resumen

  const avanzadosActivos = AVANZADOS.filter((k) => filtros[k]).length
  const totalActivos = avanzadosActivos + (filtros.search ? 1 : 0)

  const kpis: KpiItem[] = r ? [
    { label: 'Clientes', value: r.clientes, icon: Users, tone: 'accent', sub: 'en el recorte' },
    { label: 'Compraron', value: r.con_compras, icon: ShoppingBag, tone: 'pos', sub: 'en el periodo' },
    {
      label: 'Sin comprar', value: r.sin_compras, icon: UserMinus,
      tone: r.sin_compras > 0 ? 'warn' : 'pos', sub: 'nada en el periodo',
      onClick: () => cambiar({ sin_compras: filtros.sin_compras ? '' : '1' }),
      activo: !!filtros.sin_compras,
    },
    { label: 'Total comprado', value: q(r.total_comprado), icon: Wallet, tone: 'info' },
    { label: 'Ticket promedio', value: q(r.ticket_promedio), icon: Receipt, tone: 'violet', sub: `${fmtN(r.compras)} compras` },
    // Cartera viva: es de hoy, no del rango, y por eso se rotula aparte
    {
      label: 'Saldo de crédito', value: q(r.saldo_credito), icon: CreditCard,
      tone: r.saldo_credito > 0 ? 'warn' : 'pos', sub: 'pendiente hoy',
      onClick: () => cambiar({ con_credito: filtros.con_credito ? '' : '1' }),
      activo: !!filtros.con_credito,
    },
  ] : []

  const exportData: ReporteExportData | null = useMemo(() => r ? {
    titulo: 'Detalle de clientes',
    rango: `Del ${fmtFecha(desde)} al ${fmtFecha(hasta)}`,
    kpis: [
      { label: 'Clientes', value: fmtN(r.clientes) }, { label: 'Compraron', value: fmtN(r.con_compras) },
      { label: 'Total comprado', value: q(r.total_comprado) },
      { label: 'Ticket promedio', value: q(r.ticket_promedio) },
      { label: 'Saldo de crédito', value: q(r.saldo_credito) },
    ],
    tablas: [{
      titulo: 'Clientes',
      columnas: [{ label: 'Cliente' }, { label: 'Tipo' }, { label: 'Compras', align: 'right' },
        { label: 'Total', align: 'right' }, { label: 'Ticket', align: 'right' },
        { label: 'Última compra' }, { label: 'Saldo', align: 'right' }],
      filas: clientes.map((c) => [
        c.nombre, c.tipo === 'juridico' ? 'Jurídico' : 'Natural', fmtN(c.compras),
        q(c.total_comprado), q(c.ticket_promedio),
        c.ultima_compra ? fmtFecha(c.ultima_compra) : '—', q(c.saldo_credito),
      ]),
    }],
  } : null, [r, clientes, desde, hasta])

  return (
    <DetalleShell
      titulo="Detalle de clientes"
      subtitulo="Frecuencia, ticket promedio y saldo pendiente de cada cliente"
      volverA="/reportes"
      cargandoFondo={isFetching}
      acciones={<BotonesExportar data={exportData} />}
      filtros={(
        <>
          <div className="toolbar">
            <BuscadorToolbar placeholder="Buscar por nombre, NIT, email o teléfono…"
              value={texto} onChange={setTexto} cargando={isFetching} />
            <RangoFechas desde={desde} hasta={hasta} onChange={(nuevo) => cambiar(nuevo)} />
            <Select value={filtros.sort ?? 'total_desc'} onValueChange={(v) => cambiar({ sort: v })} ariaLabel="Orden"
              options={[
                { value: 'total_desc', label: 'Mayor compra' },
                { value: 'total_asc', label: 'Menor compra' },
                { value: 'compras_desc', label: 'Más frecuentes' },
                { value: 'ticket_desc', label: 'Mayor ticket' },
                { value: 'abandono', label: 'Más tiempo sin comprar' },
                { value: 'saldo_desc', label: 'Mayor saldo pendiente' },
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
              <Select value={filtros.tipo ?? 'todos'} onValueChange={(v) => cambiar({ tipo: v === 'todos' ? '' : v })} ariaLabel="Tipo de cliente"
                options={[
                  { value: 'todos', label: 'Todos los tipos' },
                  { value: 'natural', label: 'Persona natural' },
                  { value: 'juridico', label: 'Persona jurídica' },
                ]} />
              <Select value={filtros.estado ?? 'todos'} onValueChange={(v) => cambiar({ estado: v === 'todos' ? '' : v })} ariaLabel="Estado"
                options={[
                  { value: 'todos', label: 'Activos e inactivos' },
                  { value: 'activo', label: 'Solo activos' },
                  { value: 'inactivo', label: 'Solo inactivos' },
                ]} />
              <Select value={filtros.con_credito ?? 'todos'} onValueChange={(v) => cambiar({ con_credito: v === 'todos' ? '' : v })} ariaLabel="Crédito"
                options={[
                  { value: 'todos', label: 'Con y sin crédito' },
                  { value: '1', label: 'Solo con crédito vigente' },
                ]} />
              <Select value={filtros.sin_compras ?? 'todos'} onValueChange={(v) => cambiar({ sin_compras: v === 'todos' ? '' : v })} ariaLabel="Compras"
                options={[
                  { value: 'todos', label: 'Compraron o no' },
                  { value: '1', label: 'Solo sin compras' },
                ]} />
              <RangoNumerico prefijo="Q" etiqueta="Comprado" step={1}
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
      vacio={clientes.length === 0}
      refetch={refetch}
      meta={data?.meta}
      page={page}
      setPage={(actualizar) => setFiltros({ page: String(actualizar(page)) })}
    >
      <table className="tbl">
        <thead>
          <tr>
            <th className="num col-no" style={{ width: 44 }}>No.</th>
            <th className="col-id">Cliente</th>
            <th style={{ width: 90 }}>Tipo</th>
            <th className="num">Compras</th>
            <th className="num">Total</th>
            <th className="num">Ticket</th>
            <th className="num">Última compra</th>
            <th className="num" title="Saldo de crédito pendiente al día de hoy">Saldo</th>
          </tr>
        </thead>
        <tbody>
          {clientes.map((c, i) => (
            <FilaCliente key={c.id} c={c} numero={(data?.meta.from ?? 1) + i} />
          ))}
        </tbody>
      </table>
    </DetalleShell>
  )
}

function FilaCliente({ c, numero }: { c: ClienteDetalleFila; numero: number }) {
  const enRiesgo = c.dias_sin_comprar !== null && c.dias_sin_comprar >= DIAS_ALERTA
  const nunca = c.dias_sin_comprar === null

  return (
    <tr>
      <td className="num muted tnum col-no">{numero}</td>
      <td className="col-id">
        <Link to={`/clientes/${c.id}`} style={{ fontWeight: 500 }}>{c.nombre}</Link>
        <div className="muted" style={{ fontSize: 11 }}>
          {c.nit || 'Sin NIT'}{c.telefono ? ` · ${c.telefono}` : ''}
        </div>
      </td>
      <td className="muted" style={{ fontSize: 12 }}>{c.tipo === 'juridico' ? 'Jurídico' : 'Natural'}</td>
      <td className="num tnum" style={c.compras === 0 ? { color: 'var(--text-faint)' } : undefined}>
        {fmtN(c.compras)}
      </td>
      <td className="num tnum" style={{ fontWeight: 600 }}>{q(c.total_comprado)}</td>
      <td className="num tnum muted">{c.compras > 0 ? q(c.ticket_promedio) : '—'}</td>
      <td className="num" style={{ fontSize: 12 }}>
        {nunca ? (
          <span className="muted">Nunca compró</span>
        ) : (
          <>
            <span className="tnum">{c.ultima_compra ? fmtFecha(c.ultima_compra) : '—'}</span>
            {/* Los días son sobre toda su historia, no sobre el rango: eso es lo
                que mide el abandono real */}
            <div style={{ fontSize: 10.5, color: enRiesgo ? 'var(--warn)' : 'var(--text-faint)' }}>
              {enRiesgo && <CalendarClock size={10} style={{ verticalAlign: -1, marginRight: 3 }} />}
              hace {fmtN(c.dias_sin_comprar!)} d
            </div>
          </>
        )}
      </td>
      <td className="num tnum" style={c.saldo_credito > 0 ? { color: 'var(--warn)', fontWeight: 600 } : { color: 'var(--text-faint)' }}>
        {c.saldo_credito > 0 ? q(c.saldo_credito) : '—'}
      </td>
    </tr>
  )
}
