import type { ReactNode } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'md' | 'lg'
}

/**
 * Modal accesible (Radix Dialog) estilado con el sistema de diseño.
 * Radix maneja foco, scroll-lock, Escape y ARIA; el look es nuestro CSS.
 */
export function Modal({ open, onOpenChange, title, description, children, footer, size = 'md' }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="ui-overlay" />
        <Dialog.Content className="ui-modal" data-size={size}>
          <div className="ui-modal-header">
            <div>
              <Dialog.Title className="ui-modal-title">{title}</Dialog.Title>
              {description && <Dialog.Description className="ui-modal-desc">{description}</Dialog.Description>}
            </div>
            <Dialog.Close asChild>
              <button className="icon-btn" aria-label="Cerrar"><X size={18} /></button>
            </Dialog.Close>
          </div>
          <div className="ui-modal-body">{children}</div>
          {footer && <div className="ui-modal-footer">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
