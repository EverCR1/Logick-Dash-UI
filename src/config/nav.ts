import type { IconName } from '@/components/icons'

export interface NavItem {
  to: string
  label: string
  icon: IconName
  count?: number
}

export interface NavGroup {
  type: 'group'
  label: string
  items: NavItem[]
}

export type NavEntry = NavItem | NavGroup

// Navegación del dashboard. Las rutas mapean 1:1 con los módulos de la API.
export const NAV: NavEntry[] = [
  { to: '/', label: 'Dashboard', icon: 'Dashboard' },
  {
    type: 'group',
    label: 'Gestión',
    items: [
      { to: '/usuarios', label: 'Usuarios', icon: 'Users' },
      { to: '/sucursales', label: 'Sucursales', icon: 'Building' },
      { to: '/clientes', label: 'Clientes', icon: 'UserCircle' },
      { to: '/proveedores', label: 'Proveedores', icon: 'Truck' },
    ],
  },
  {
    type: 'group',
    label: 'Inventario',
    items: [
      { to: '/productos', label: 'Productos', icon: 'Package' },
      { to: '/categorias', label: 'Categorías', icon: 'Layers' },
      { to: '/servicios', label: 'Servicios', icon: 'Boxes' },
    ],
  },
  {
    type: 'group',
    label: 'Operaciones',
    items: [
      { to: '/ventas', label: 'Ventas', icon: 'Cart' },
      { to: '/creditos', label: 'Créditos', icon: 'Card' },
    ],
  },
  {
    type: 'group',
    label: 'Tienda',
    items: [
      { to: '/pedidos', label: 'Pedidos', icon: 'Store' },
      { to: '/resenas', label: 'Reseñas', icon: 'Star' },
      { to: '/preguntas', label: 'Preguntas', icon: 'Help' },
      { to: '/reportes-tienda', label: 'Reportes', icon: 'Flag' },
      { to: '/cupones', label: 'Cupones', icon: 'Ticket' },
    ],
  },
  {
    type: 'group',
    label: 'Análisis',
    items: [
      { to: '/reportes', label: 'Reportes', icon: 'Activity' },
      { to: '/auditoria', label: 'Auditoría', icon: 'Shield' },
    ],
  },
]

// Título mostrado en el breadcrumb por ruta
export const NAV_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/usuarios': 'Usuarios',
  '/sucursales': 'Sucursales',
  '/clientes': 'Clientes',
  '/proveedores': 'Proveedores',
  '/productos': 'Productos',
  '/categorias': 'Categorías',
  '/servicios': 'Servicios',
  '/ventas': 'Ventas',
  '/creditos': 'Créditos',
  '/pedidos': 'Pedidos',
  '/resenas': 'Reseñas',
  '/preguntas': 'Preguntas',
  '/reportes-tienda': 'Reportes de tienda',
  '/cupones': 'Cupones',
  '/reportes': 'Reportes',
  '/auditoria': 'Auditoría',
}
