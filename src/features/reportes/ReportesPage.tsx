import { useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { RangoFechas, rangoPorDefecto } from '@/components/ui/RangoFechas'
import {
  TabResumen, TabVentas, TabProductos, TabServicios, TabInventario,
  TabClientes, TabVendedores, TabSucursales, TabGanancias, TabTienda,
} from './ReportesTabs'

type TabKey = 'resumen' | 'ventas' | 'productos' | 'servicios' | 'inventario' | 'clientes' | 'vendedores' | 'sucursales' | 'ganancias' | 'tienda'

const TABS: { key: TabKey; label: string; conFechas: boolean }[] = [
  { key: 'resumen', label: 'Resumen', conFechas: false },
  { key: 'ventas', label: 'Ventas', conFechas: true },
  { key: 'ganancias', label: 'Ganancias', conFechas: true },
  { key: 'productos', label: 'Productos', conFechas: true },
  { key: 'servicios', label: 'Servicios', conFechas: true },
  { key: 'clientes', label: 'Top clientes', conFechas: true },
  { key: 'vendedores', label: 'Vendedores', conFechas: true },
  { key: 'sucursales', label: 'Sucursales', conFechas: true },
  { key: 'inventario', label: 'Inventario', conFechas: false },
  { key: 'tienda', label: 'Tienda', conFechas: true },
]

export default function ReportesPage() {
  const [tab, setTab] = useState<TabKey>('resumen')
  const rango = rangoPorDefecto()
  const [desde, setDesde] = useState(rango.desde)
  const [hasta, setHasta] = useState(rango.hasta)

  const activa = TABS.find((t) => t.key === tab)!

  return (
    <>
      <PageHeader title="Reportes" subtitle="Análisis y métricas del negocio" />

      <div className="rep-bar">
        <div className="tabs rep-tabs">
          {TABS.map((t) => (
            <button key={t.key} className="tab" data-active={t.key === tab} onClick={() => setTab(t.key)}>{t.label}</button>
          ))}
        </div>

        {activa.conFechas && (
          <div className="rep-fechas">
            <RangoFechas desde={desde} hasta={hasta}
              onChange={(r) => { setDesde(r.desde); setHasta(r.hasta) }} />
          </div>
        )}
      </div>

      {tab === 'resumen' && <TabResumen />}
      {tab === 'ventas' && <TabVentas desde={desde} hasta={hasta} />}
      {tab === 'ganancias' && <TabGanancias desde={desde} hasta={hasta} />}
      {tab === 'productos' && <TabProductos desde={desde} hasta={hasta} />}
      {tab === 'servicios' && <TabServicios desde={desde} hasta={hasta} />}
      {tab === 'clientes' && <TabClientes desde={desde} hasta={hasta} />}
      {tab === 'vendedores' && <TabVendedores desde={desde} hasta={hasta} />}
      {tab === 'sucursales' && <TabSucursales desde={desde} hasta={hasta} />}
      {tab === 'inventario' && <TabInventario />}
      {tab === 'tienda' && <TabTienda desde={desde} hasta={hasta} />}
    </>
  )
}
