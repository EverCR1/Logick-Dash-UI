import { useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { rangoPorDefecto } from './reportes-utils'
import {
  TabResumen, TabVentas, TabProductos, TabServicios, TabInventario,
  TabClientes, TabVendedores, TabSucursales, TabGanancias,
} from './ReportesTabs'

type TabKey = 'resumen' | 'ventas' | 'productos' | 'servicios' | 'inventario' | 'clientes' | 'vendedores' | 'sucursales' | 'ganancias'

const TABS: { key: TabKey; label: string; conFechas: boolean }[] = [
  { key: 'resumen', label: 'Resumen', conFechas: false },
  { key: 'ventas', label: 'Ventas', conFechas: true },
  { key: 'productos', label: 'Productos', conFechas: true },
  { key: 'servicios', label: 'Servicios', conFechas: true },
  { key: 'inventario', label: 'Inventario', conFechas: false },
  { key: 'clientes', label: 'Clientes', conFechas: true },
  { key: 'vendedores', label: 'Vendedores', conFechas: true },
  { key: 'sucursales', label: 'Sucursales', conFechas: true },
  { key: 'ganancias', label: 'Ganancias', conFechas: true },
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

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
        <div className="tabs" style={{ flexWrap: 'wrap', overflowX: 'auto' }}>
          {TABS.map((t) => (
            <button key={t.key} className="tab" data-active={t.key === tab} onClick={() => setTab(t.key)}>{t.label}</button>
          ))}
        </div>
        {activa.conFechas && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 'auto' }}>
            <input type="date" className="form-input" style={{ width: 'auto' }} value={desde} max={hasta} onChange={(e) => setDesde(e.target.value)} aria-label="Desde" />
            <span className="muted" style={{ fontSize: 12 }}>—</span>
            <input type="date" className="form-input" style={{ width: 'auto' }} value={hasta} min={desde} onChange={(e) => setHasta(e.target.value)} aria-label="Hasta" />
          </div>
        )}
      </div>

      {tab === 'resumen' && <TabResumen />}
      {tab === 'ventas' && <TabVentas desde={desde} hasta={hasta} />}
      {tab === 'productos' && <TabProductos desde={desde} hasta={hasta} />}
      {tab === 'servicios' && <TabServicios desde={desde} hasta={hasta} />}
      {tab === 'inventario' && <TabInventario />}
      {tab === 'clientes' && <TabClientes desde={desde} hasta={hasta} />}
      {tab === 'vendedores' && <TabVendedores desde={desde} hasta={hasta} />}
      {tab === 'sucursales' && <TabSucursales desde={desde} hasta={hasta} />}
      {tab === 'ganancias' && <TabGanancias desde={desde} hasta={hasta} />}
    </>
  )
}
