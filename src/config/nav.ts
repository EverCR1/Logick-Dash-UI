import type { IconName } from '@/components/icons'
import type { Rol } from '@/types/auth'

export interface NavItem {
  to: string
  label: string
  icon: IconName
  count?: number
  /** Roles con acceso. Si se omite, visible para todos. */
  roles?: Rol[]
}

export interface NavGroup {
  type: 'group'
  label: string
  items: NavItem[]
}

export type NavEntry = NavItem | NavGroup

const GESTION_OPERACIONES: Rol[] = ['administrador', 'vendedor']

// Navegación del dashboard. Las rutas mapean 1:1 con los módulos de la API.
// Los `roles` replican la visibilidad por rol del dashboard Blade original.
export const NAV: NavEntry[] = [
  { to: '/', label: 'Dashboard', icon: 'Dashboard' },
  {
    type: 'group',
    label: 'Gestión',
    items: [
      { to: '/usuarios', label: 'Usuarios', icon: 'Users', roles: ['administrador'] },
      { to: '/sucursales', label: 'Sucursales', icon: 'Building', roles: ['administrador'] },
      { to: '/clientes', label: 'Clientes', icon: 'UserCircle', roles: GESTION_OPERACIONES },
      { to: '/proveedores', label: 'Proveedores', icon: 'Truck', roles: GESTION_OPERACIONES },
    ],
  },
  {
    type: 'group',
    label: 'Inventario',
    items: [
      { to: '/productos', label: 'Productos', icon: 'Package', roles: GESTION_OPERACIONES },
      { to: '/categorias', label: 'Categorías', icon: 'Layers', roles: GESTION_OPERACIONES },
      { to: '/servicios', label: 'Servicios', icon: 'Boxes', roles: GESTION_OPERACIONES },
    ],
  },
  {
    type: 'group',
    label: 'Operaciones',
    items: [
      { to: '/ventas', label: 'Ventas', icon: 'Cart', roles: GESTION_OPERACIONES },
      { to: '/creditos', label: 'Créditos', icon: 'Card', roles: GESTION_OPERACIONES },
    ],
  },
  {
    type: 'group',
    label: 'Tienda',
    items: [
      { to: '/pedidos', label: 'Pedidos', icon: 'Store', roles: GESTION_OPERACIONES },
      { to: '/resenas', label: 'Reseñas', icon: 'Star', roles: GESTION_OPERACIONES },
      { to: '/preguntas', label: 'Preguntas', icon: 'Help', roles: GESTION_OPERACIONES },
      { to: '/reportes-tienda', label: 'Reportes', icon: 'Flag', roles: GESTION_OPERACIONES },
      { to: '/cupones', label: 'Cupones', icon: 'Ticket', roles: ['administrador'] },
    ],
  },
  {
    type: 'group',
    label: 'Análisis',
    items: [
      { to: '/reportes', label: 'Reportes', icon: 'Activity', roles: ['administrador', 'analista'] },
      { to: '/auditoria', label: 'Auditoría', icon: 'Shield', roles: ['administrador'] },
    ],
  },
]

/** Devuelve true si el rol puede ver el item (sin `roles` = visible para todos). */
export function puedeVer(it: NavItem, rol: Rol | undefined): boolean {
  if (!it.roles) return true
  return rol != null && it.roles.includes(rol)
}

// Todos los items de navegación aplanados (sin grupos), para resolución de rutas.
const NAV_ITEMS: NavItem[] = NAV.flatMap((e) => ('type' in e ? e.items : [e]))

/**
 * Roles requeridos para una ruta. Empareja el item de nav cuyo `to` sea prefijo
 * del path (el más específico gana), de modo que las rutas de detalle heredan los
 * roles de su módulo (p. ej. `/usuarios/5` → roles de `/usuarios`).
 * Devuelve `undefined` cuando la ruta no tiene restricción de rol.
 */
export function rolesDeRuta(pathname: string): Rol[] | undefined {
  let match: NavItem | undefined
  for (const it of NAV_ITEMS) {
    if (it.to === '/') continue // el dashboard es visible para todos
    if (pathname === it.to || pathname.startsWith(it.to + '/')) {
      if (!match || it.to.length > match.to.length) match = it
    }
  }
  return match?.roles
}

/** Conveniencia: ¿el rol puede acceder a la ruta dada? */
export function puedeAcceder(pathname: string, rol: Rol | undefined): boolean {
  const roles = rolesDeRuta(pathname)
  if (!roles) return true
  return rol != null && roles.includes(rol)
}

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
