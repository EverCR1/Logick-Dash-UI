import { Crown, Activity, User, Lock, Users, Settings, Boxes, FileText, ShoppingCart, type LucideIcon } from 'lucide-react'

export type RolKey = 'administrador' | 'vendedor' | 'analista'

export const ROLES: Record<RolKey, { label: string; icon: LucideIcon; dataRole: string }> = {
  administrador: { label: 'Administrador', icon: Crown, dataRole: 'admin' },
  analista: { label: 'Analista', icon: Activity, dataRole: 'analista' },
  vendedor: { label: 'Vendedor', icon: User, dataRole: 'vendedor' },
}

export const rolMeta = (rol: string) => ROLES[rol as RolKey] ?? { label: rol, icon: User, dataRole: 'vendedor' }

export const PERMISOS: Record<RolKey, { label: string; icon: LucideIcon }[]> = {
  administrador: [
    { label: 'Acceso total al sistema', icon: Lock },
    { label: 'Gestión de usuarios', icon: Users },
    { label: 'Configuración del sistema', icon: Settings },
    { label: 'Ver todos los reportes', icon: Activity },
    { label: 'Gestionar productos y ventas', icon: Boxes },
  ],
  analista: [
    { label: 'Ver todos los reportes', icon: Activity },
    { label: 'Exportar datos', icon: FileText },
    { label: 'Ver inventario', icon: Boxes },
  ],
  vendedor: [
    { label: 'Registrar ventas', icon: ShoppingCart },
    { label: 'Ver clientes', icon: Users },
    { label: 'Ver inventario', icon: Boxes },
  ],
}

export const iniciales = (nombres: string, apellidos: string): string =>
  ((nombres[0] ?? '') + (apellidos[0] ?? '')).toUpperCase() || 'U'
