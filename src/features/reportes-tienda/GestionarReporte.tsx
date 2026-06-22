import { useState, useEffect, type FormEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { reportesTiendaApi } from '@/lib/api'
import { fmtFecha } from '@/lib/format'
import type { ReporteEstado } from '@/types/reporte-problema'

export function GestionarReporte({ open, onClose, reporteId }: {
  open: boolean; onClose: () => void; reporteId: number | null
}) {
  const queryClient = useQueryClient()
  const [estado, setEstado] = useState<ReporteEstado>('pendiente')
  const [nota, setNota] = useState('')
  const [puntos, setPuntos] = useState('')

  const { data: reporte, isLoading } = useQuery({
    queryKey: ['reporte-tienda', reporteId],
    queryFn: () => reportesTiendaApi.obtener(reporteId!),
    enabled: open && !!reporteId,
  })

  useEffect(() => {
    if (reporte) {
      setEstado(reporte.estado)
      setNota(reporte.nota_admin ?? '')
      setPuntos(reporte.puntos_otorgados ? String(reporte.puntos_otorgados) : '')
    }
  }, [reporte])

  const guardar = useMutation({
    mutationFn: () => reportesTiendaApi.actualizar(reporteId!, {
      estado,
      nota_admin: nota.trim() || null,
      puntos_otorgados: puntos ? Number(puntos) : null,
    }),
    onSuccess: () => {
      toast.success('Reporte actualizado')
      queryClient.invalidateQueries({ queryKey: ['reportes-tienda'] })
      onClose()
    },
    onError: () => toast.error('No se pudo actualizar el reporte'),
  })

  const onSubmit = (ev: FormEvent) => { ev.preventDefault(); guardar.mutate() }

  const esCuenta = !!reporte?.cuenta
  const muestraPuntos = estado === 'resuelto' && esCuenta

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} title="Gestionar reporte" size="lg"
      footer={<>
        <button type="button" className="btn" onClick={onClose} disabled={guardar.isPending}>Cancelar</button>
        <button type="submit" form="reporte-form" className="btn btn-primary" disabled={guardar.isPending || isLoading}>
          {guardar.isPending && <Loader2 size={14} className="spin" />}Guardar cambios
        </button>
      </>}>
      {isLoading || !reporte ? (
        <div className="empty" style={{ padding: 40 }}><Loader2 size={22} className="spin" style={{ color: 'var(--accent)' }} /></div>
      ) : (
        <form id="reporte-form" onSubmit={onSubmit} className="form-grid">
          <div className="form-field">
            <label>Categoría</label>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{reporte.categoria_label}</div>
          </div>
          <div className="form-field">
            <label>Recibido</label>
            <div style={{ fontSize: 13 }}>{fmtFecha(reporte.created_at, true)}</div>
          </div>

          <div className="form-field col-2">
            <label>Descripción</label>
            <div style={{ fontSize: 13, padding: '8px 10px', background: 'var(--surface-2)', borderRadius: 8, whiteSpace: 'pre-wrap' }}>{reporte.descripcion}</div>
          </div>

          <div className="form-field">
            <label>Contacto</label>
            <div style={{ fontSize: 13 }}>
              {reporte.cuenta
                ? <>{[reporte.cuenta.nombre, reporte.cuenta.apellido].filter(Boolean).join(' ')}<div className="muted" style={{ fontSize: 11.5 }}>{reporte.cuenta.email}</div></>
                : <>{reporte.nombre_contacto || 'Invitado'}<div className="muted" style={{ fontSize: 11.5 }}>{reporte.email_contacto || '—'}{reporte.telefono_contacto ? ` · ${reporte.telefono_contacto}` : ''}</div></>}
            </div>
          </div>
          <div className="form-field">
            <label>Estado</label>
            <Select value={estado} onValueChange={(v) => setEstado(v as ReporteEstado)}
              options={[
                { value: 'pendiente', label: 'Pendiente' },
                { value: 'en_revision', label: 'En revisión' },
                { value: 'resuelto', label: 'Resuelto' },
                { value: 'invalido', label: 'Inválido' },
              ]} />
          </div>

          {muestraPuntos && (
            <div className="form-field">
              <label>Puntos a otorgar</label>
              <input className="form-input" type="number" min={1} max={9999} value={puntos}
                onChange={(e) => setPuntos(e.target.value)} placeholder="Opcional" />
              <span className="muted" style={{ fontSize: 11 }}>Se otorgan una sola vez al marcar como resuelto.</span>
            </div>
          )}

          <div className="form-field col-2">
            <label>Nota interna (admin)</label>
            <textarea className="form-textarea" rows={3} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Notas de seguimiento…" />
          </div>
        </form>
      )}
    </Modal>
  )
}
