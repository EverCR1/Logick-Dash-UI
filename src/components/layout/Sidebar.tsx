import { NavLink } from 'react-router-dom'
import { I } from '@/components/icons'
import { Logo } from '@/components/Logo'
import { brand } from '@/config/brand'
import { NAV, puedeVer, type NavItem } from '@/config/nav'
import { useAuth } from '@/lib/auth'

function NavItemLink({ it }: { it: NavItem }) {
  const IconC = I[it.icon]
  return (
    <NavLink
      to={it.to}
      end={it.to === '/'}
      title={it.label}
      className={({ isActive }) => 'nav-item' + (isActive ? ' is-active' : '')}
    >
      <IconC />
      <span className="nav-item-label">{it.label}</span>
      {it.count != null && <span className="nav-item-badge">{it.count}</span>}
    </NavLink>
  )
}

export default function Sidebar({ onToggle }: { onToggle: () => void }) {
  const { usuario } = useAuth()
  const rol = usuario?.rol

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo has-logo"><Logo size={26} /></div>
        <div className="sidebar-brand">{brand.name}</div>
        <button className="sidebar-collapse" onClick={onToggle} aria-label="Contraer o expandir menú" title="Contraer o expandir menú">
          <I.ChevronsLeft />
        </button>
      </div>
      <nav className="sidebar-nav">
        {NAV.map((entry, i) => {
          if ('type' in entry) {
            const items = entry.items.filter((it) => puedeVer(it, rol))
            if (items.length === 0) return null
            return (
              <div key={i} className="nav-group">
                <div className="nav-group-label">{entry.label}</div>
                {items.map((it) => (
                  <NavItemLink key={it.to} it={it} />
                ))}
              </div>
            )
          }
          return puedeVer(entry, rol) ? <NavItemLink key={entry.to} it={entry} /> : null
        })}
      </nav>
      <div className="sidebar-footer">Logickem © 2026</div>
    </aside>
  )
}
