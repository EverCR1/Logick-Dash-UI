import { useState, useEffect, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { preguntasApi } from '@/lib/api'
import type { Pregunta } from '@/types/pregunta'

export function ResponderPregunta({ open, onClose, pregunta }: {
  open: boolean; onClose: () => void; pregunta: Pregunta | null
}) {
  const queryClient = useQueryClient()
  const [respuesta, setRespuesta] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) { setRespuesta(pregunta?.respuesta ?? ''); setError('') }
  }, [open, pregunta])

  const guardar = useMutation({
    mutationFn: () => preguntasApi.actualizar(pregunta!.id, { estado: 'respondida', respuesta: respuesta.trim() }),
    onSuccess: () => {
      toast.success('Respuesta publicada')
      queryClient.invalidateQueries({ queryKey: ['preguntas'] })
      onClose()
    },
    onError: () => toast.error('No se pudo guardar la respuesta'),
  })

  const onSubmit = (ev: FormEvent) => {
    ev.preventDefault()
    if (!respuesta.trim()) { setError('La respuesta es obligatoria'); return }
    guardar.mutate()
  }

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} title="Responder pregunta"
      footer={<>
        <button type="button" className="btn" onClick={onClose} disabled={guardar.isPending}>Cancelar</button>
        <button type="submit" form="responder-form" className="btn btn-primary" disabled={guardar.isPending}>
          {guardar.isPending && <Loader2 size={14} className="spin" />}Publicar respuesta
        </button>
      </>}>
      {pregunta && (
        <form id="responder-form" onSubmit={onSubmit} className="form-grid">
          <div className="form-field col-2">
            <label>Producto</label>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{pregunta.producto?.nombre ?? '—'}</div>
          </div>
          <div className="form-field col-2">
            <label>Pregunta del cliente</label>
            <div style={{ fontSize: 13, padding: '8px 10px', background: 'var(--surface-2)', borderRadius: 8, whiteSpace: 'pre-wrap' }}>{pregunta.pregunta}</div>
          </div>
          <div className="form-field col-2">
            <label>Respuesta <span className="req">*</span></label>
            <textarea className="form-textarea" rows={4} value={respuesta} autoFocus
              onChange={(e) => { setRespuesta(e.target.value); setError('') }} aria-invalid={!!error} />
            {error && <span className="form-error">{error}</span>}
          </div>
        </form>
      )}
    </Modal>
  )
}
