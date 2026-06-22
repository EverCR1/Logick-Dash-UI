import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { CommandPalette } from '@/components/CommandPalette'

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)
  const { pathname } = useLocation()

  // Atajo global ⌘K / Ctrl+K para abrir la búsqueda rápida
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Cierra el menú móvil al cambiar de ruta
  useEffect(() => { setMobileNav(false) }, [pathname])

  return (
    <div className="app" data-sidebar={collapsed ? 'collapsed' : 'expanded'} data-mobile-nav={mobileNav ? 'open' : 'closed'}>
      <Sidebar onToggle={() => setCollapsed((c) => !c)} />
      {mobileNav && <div className="sidebar-backdrop" onClick={() => setMobileNav(false)} />}
      <div className="main">
        <Topbar onOpenSearch={() => setPaletteOpen(true)} onOpenNav={() => setMobileNav(true)} />
        <div className="content">
          <Outlet />
        </div>
      </div>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  )
}
