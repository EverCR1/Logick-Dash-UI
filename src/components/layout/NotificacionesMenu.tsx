import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { X, CheckCircle2 } from 'lucide-react'
import { I, type IconName } from '@/components/icons'
import { notificacionesApi } from '@/lib/api'
import { hace } from '@/lib/format'
import type { Notificacion } from '@/types/notificacion'

// Ícono según el tipo de notificación
function iconoDe(tipo: string): IconName {
  if (tipo.startsWith('stock')) return 'Package'
  if (tipo.startsWith('pedido')) return 'Store'
  if (tipo.startsWith('resena')) return 'Star'
  if (tipo.startsWith('pregunta')) return 'Help'
  if (tipo.startsWith('reporte')) return 'Flag'
  if (tipo.startsWith('auditoria')) return 'Shield'
  return 'Bell'
}

export default function NotificacionesMenu() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [abierto, setAbierto] = useState(false)

  const { data } = useQuery({
    queryKey: ['notificaciones'],
    queryFn: notificacionesApi.listar,
    refetchInterval: 60_000,           // sondea cada minuto
    refetchOnWindowFocus: true,
  })

  const notificaciones = data?.notificaciones ?? []
  const noLeidas = data?.no_leidas ?? 0

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
  }

  const abrir = (n: Notificacion) => {
    setAbierto(false)
    if (n.ruta) navigate(n.ruta)
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
              notificaciones.map((n) => {
                const Icono = I[iconoDe(n.tipo)]
                const esStock = n.tipo.startsWith('stock')
                return (
                  <div key={n.id} className="notif-item" data-nivel={n.nivel} data-unread={!n.leida}>
                    <span className="notif-ico" data-nivel={n.nivel}><Icono size={15} /></span>
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
              })
            )}
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
