import * as Alert from '@radix-ui/react-alert-dialog'
import { Loader2 } from 'lucide-react'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  loading?: boolean
  onConfirm: () => void
}

/**
 * Diálogo de confirmación accesible (Radix AlertDialog) estilado con el sistema.
 */
export function ConfirmDialog({
  open, onOpenChange, title, description,
  confirmLabel = 'Confirmar', cancelLabel = 'Cancelar',
  danger = false, loading = false, onConfirm,
}: ConfirmDialogProps) {
  return (
    <Alert.Root open={open} onOpenChange={onOpenChange}>
      <Alert.Portal>
        <Alert.Overlay className="ui-overlay" />
        <Alert.Content className="ui-confirm">
          <Alert.Title className="ui-confirm-title">{title}</Alert.Title>
          {description && <Alert.Description className="ui-confirm-desc">{description}</Alert.Description>}
          <div className="ui-confirm-actions">
            <Alert.Cancel asChild>
              <button className="btn" disabled={loading}>{cancelLabel}</button>
            </Alert.Cancel>
            <button
              className={danger ? 'btn btn-danger' : 'btn btn-primary'}
              disabled={loading}
              onClick={(e) => { e.preventDefault(); onConfirm() }}
            >
              {loading && <Loader2 size={14} className="spin" />}
              {confirmLabel}
            </button>
          </div>
        </Alert.Content>
      </Alert.Portal>
    </Alert.Root>
  )
}
