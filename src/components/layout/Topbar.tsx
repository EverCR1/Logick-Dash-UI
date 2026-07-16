import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { I } from '@/components/icons'
import { useTheme } from '@/lib/theme'
import { useAuth } from '@/lib/auth'
import { NAV_TITLES } from '@/config/nav'
import { ProfileModal } from '@/features/perfil/ProfileModal'
import { ChangePasswordModal } from '@/features/perfil/ChangePasswordModal'
import NotificacionesMenu from './NotificacionesMenu'

const ROL_LABEL: Record<string, string> = {
  administrador: 'Administrador',
  vendedor: 'Vendedor',
  analista: 'Analista',
}

function iniciales(nombres: string, apellidos: string): string {
  return ((nombres[0] ?? '') + (apellidos[0] ?? '')).toUpperCase() || 'U'
}

export default function Topbar({ onOpenSearch, onOpenNav }: { onOpenSearch: () => void; onOpenNav: () => void }) {
  const { theme, setTheme } = useTheme()
  const { usuario, logout } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const title = NAV_TITLES[pathname] ?? 'Dashboard'
  const [perfilOpen, setPerfilOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="topbar">
      <button type="button" className="topbar-burger" onClick={onOpenNav} aria-label="Abrir menú">
        <I.More />
      </button>
      <div className="breadcrumb">
        <I.Home size={14} />
        <span className="sep">/</span>
        <span className="current">{title}</span>
      </div>

      <button type="button" className="topbar-search" onClick={onOpenSearch} aria-label="Búsqueda rápida">
        <I.Search />
        <span className="topbar-search-ph">Ir a un módulo…</span>
        <span className="kbd">⌘K</span>
      </button>

      <div className="theme-toggle">
        <button data-on={theme === 'light'} onClick={() => setTheme('light')} title="Modo claro">
          <I.Sun />
        </button>
        <button data-on={theme === 'dark'} onClick={() => setTheme('dark')} title="Modo oscuro">
          <I.Moon />
        </button>
      </div>

      <NotificacionesMenu />
      <button className="topbar-icon-btn" title="Ajustes">
        <I.Settings />
      </button>

      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button className="user-chip">
            <div className="avatar">{usuario ? iniciales(usuario.nombres, usuario.apellidos) : 'U'}</div>
            <span>{usuario?.nombres ?? 'Usuario'}</span>
            <span className="role">{usuario ? ROL_LABEL[usuario.rol] ?? usuario.rol : ''}</span>
            <I.ChevronDown size={13} style={{ color: 'var(--text-muted)' }} />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content className="menu-content" align="end" sideOffset={8}>
            <div className="menu-label">{usuario?.nombre_completo ?? 'Sesión'}</div>
            <DropdownMenu.Item className="menu-item" onSelect={() => setPerfilOpen(true)}>
              <I.UserCircle /> Mi perfil
            </DropdownMenu.Item>
            <DropdownMenu.Item className="menu-item" onSelect={() => setPasswordOpen(true)}>
              <I.Settings /> Cambiar contraseña
            </DropdownMenu.Item>
            <DropdownMenu.Separator className="menu-sep" />
            <DropdownMenu.Item className="menu-item danger" onSelect={handleLogout}>
              <I.LogOut /> Cerrar sesión
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <ProfileModal open={perfilOpen} onClose={() => setPerfilOpen(false)} />
      <ChangePasswordModal open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </header>
  )
}
