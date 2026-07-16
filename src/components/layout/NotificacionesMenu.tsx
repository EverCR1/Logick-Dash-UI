import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { X, CheckCircle2, ChevronDown } from 'lucide-react'
import { I, type IconName } from '@/components/icons'
import { notificacionesApi } from '@/lib/api'
import { hace } from '@/lib/format'
import type { Notificacion, NotificacionNivel } from '@/types/notificacion'

// Categoría (prefijo del tipo) → usada para agrupar y para el ícono
function categoriaDe(tipo: string): string {
  return tipo.split('_')[0] || 'otros'
}

// Ícono según la categoría de la notificación
function iconoDe(cat: string): IconName {
  switch (cat) {
    case 'stock':     return 'Package'
    case 'pedido':    return 'Store'
    case 'resena':    return 'Star'
    case 'pregunta':  return 'Help'
    case 'reporte':   return 'Flag'
    case 'auditoria': return 'Shield'
    default:          return 'Bell'
  }
}

// Etiqueta legible por categoría
const LABEL: Record<string, string> = {
  stock:     'Stock',
  pedido:    'Pedidos',
  resena:    'Reseñas',
  pregunta:  'Preguntas',
  reporte:   'Reportes',
  auditoria: 'Auditoría',
  otros:     'Notificaciones',
}

// Prioridad de nivel para elegir el color del grupo
const RANK: Record<NotificacionNivel, number> = { danger: 3, warning: 2, info: 1 }

interface Grupo {
  clave: string
  cat: string
  nivel: NotificacionNivel
  items: Notificacion[]
  hayNoLeidas: boolean
  masReciente: string
}

function agrupar(notis: Notificacion[]): Grupo[] {
  const mapa = new Map<string, Grupo>()

  for (const n of notis) {
    const cat = categoriaDe(n.tipo)
    let g = mapa.get(cat)
    if (!g) {
      g = { clave: cat, cat, nivel: n.nivel, items: [], hayNoLeidas: false, masReciente: n.created_at }
      mapa.set(cat, g)
    }
    g.items.push(n)
    if (!n.leida) g.hayNoLeidas = true
    if (RANK[n.nivel] > RANK[g.nivel]) g.nivel = n.nivel
    if (n.created_at > g.masReciente) g.masReciente = n.created_at
  }

  // Grupos ordenados por la notificación más reciente de cada uno
  return [...mapa.values()].sort((a, b) => (a.masReciente < b.masReciente ? 1 : -1))
}

export default function NotificacionesMenu() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [abierto, setAbierto] = useState(false)
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set())

  const { data } = useQuery({
    queryKey: ['notificaciones'],
    queryFn: notificacionesApi.listar,
    refetchInterval: 60_000,           // sondea cada minuto
    refetchOnWindowFocus: true,
  })

  const notificaciones = data?.notificaciones ?? []
  const noLeidas = data?.no_leidas ?? 0

  const grupos = useMemo(() => agrupar(notificaciones), [notificaciones])

  const marcarLeidas = useMutation({
    mutationFn: notificacionesApi.marcarLeidas,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notificaciones'] }),
  })

  const cambiarEstado = useMutation({
    mutationFn: ({ id, estado }: { id: number; estado: 'aplicado' | 'descartado' }) =>
      notificacionesApi.cambiarEstado(id, estado),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notificaciones'] }),
    onError: () => toast.error('No se pudo actualizar la notificación'),
  })

  // Al abrir el panel, marca todas como leídas (limpia el contador, estilo "visto")
  const onOpenChange = (o: boolean) => {
    setAbierto(o)
    if (o && noLeidas > 0) marcarLeidas.mutate()
    if (!o) setExpandidos(new Set())   // colapsa todo al cerrar
  }

  const abrir = (n: Notificacion) => {
    setAbierto(false)
    if (n.ruta) navigate(n.ruta)
  }

  const toggleGrupo = (clave: string) => {
    setExpandidos((prev) => {
      const s = new Set(prev)
      s.has(clave) ? s.delete(clave) : s.add(clave)
      return s
    })
  }

  // Renderiza una notificación individual (usada suelta o dentro de un grupo)
  const renderItem = (n: Notificacion, dentroDeGrupo = false) => {
    const Icono = I[iconoDe(categoriaDe(n.tipo))]
    const esStock = n.tipo.startsWith('stock')
    return (
      <div key={n.id} className="notif-item" data-nivel={n.nivel} data-unread={!n.leida} data-sub={dentroDeGrupo}>
        {!dentroDeGrupo && (
          <span className="notif-ico" data-nivel={n.nivel}><Icono size={15} /></span>
        )}
        <div className="notif-body" onClick={() => abrir(n)} role="button" tabIndex={0}>
          <div className="notif-item-title">{n.titulo}</div>
          {n.mensaje && <div className="notif-item-msg">{n.mensaje}</div>}
          <div className="notif-item-time">{hace(n.created_at)}</div>
          {esStock && (
            <div className="notif-actions" onClick={(e) => e.stopPropagation()}>
              <button className="notif-act" data-tone="pos"
                onClick={() => cambiarEstado.mutate({ id: n.id, estado: 'aplicado' })}>
                <CheckCircle2 size={12} /> Repuesto
              </button>
            </div>
          )}
        </div>
        <button className="notif-dismiss" title="Descartar"
          onClick={() => cambiarEstado.mutate({ id: n.id, estado: 'descartado' })}>
          <X size={13} />
        </button>
      </div>
    )
  }

  return (
    <DropdownMenu.Root open={abierto} onOpenChange={onOpenChange}>
      <DropdownMenu.Trigger asChild>
        <button className="topbar-icon-btn" title="Notificaciones" aria-label="Notificaciones">
          <I.Bell />
          {noLeidas > 0 && <span className="notif-count">{noLeidas > 9 ? '9+' : noLeidas}</span>}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content className="notif-panel" align="end" sideOffset={8}>
          <div className="notif-head">
            <span className="notif-title">Notificaciones</span>
            {notificaciones.length > 0 && <span className="notif-badge">{notificaciones.length}</span>}
          </div>

          <div className="notif-list">
            {notificaciones.length === 0 ? (
              <div className="notif-empty">
                <I.Bell size={26} />
                <div>Sin notificaciones</div>
                <span>Todo al día por aquí.</span>
              </div>
            ) : (
              grupos.map((g) => {
                // Grupo de 1 → se muestra plano, sin acordeón
                if (g.items.length === 1) return renderItem(g.items[0])

                const Icono = I[iconoDe(g.cat)]
                const abiertoGrupo = expandidos.has(g.clave)
                const primero = g.items[0]
                const resumen = `${primero.titulo}${g.items.length > 1 ? ` +${g.items.length - 1} más` : ''}`

                return (
                  <div key={g.clave} className="notif-group" data-open={abiertoGrupo}>
                    <div className="notif-item notif-group-head" data-nivel={g.nivel}
                      data-unread={g.hayNoLeidas} role="button" tabIndex={0}
                      onClick={() => toggleGrupo(g.clave)}>
                      <span className="notif-ico" data-nivel={g.nivel}><Icono size={15} /></span>
                      <div className="notif-body">
                        <div className="notif-group-title">
                          {LABEL[g.cat] ?? LABEL.otros}
                          <span className="notif-group-count">{g.items.length}</span>
                        </div>
                        <div className="notif-item-msg">{resumen}</div>
                        <div className="notif-item-time">{hace(g.masReciente)}</div>
                      </div>
                      <span className="notif-chevron" aria-hidden><ChevronDown size={15} /></span>
                    </div>

                    {abiertoGrupo && (
                      <div className="notif-sublist">
                        {g.items.map((n) => renderItem(n, true))}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
