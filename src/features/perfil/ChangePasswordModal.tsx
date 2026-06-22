import { useState, useEffect, type ReactNode, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { authApi } from '@/lib/api'
import { useAuth } from '@/lib/auth'

type FormState = { current_password: string; new_password: string; new_password_confirmation: string }
const VACIO: FormState = { current_password: '', new_password: '', new_password_confirmation: '' }

export function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState<FormState>(VACIO)
  const [errores, setErrores] = useState<Record<string, string>>({})

  useEffect(() => { if (open) { setForm(VACIO); setErrores({}) } }, [open])

  const set = (c: keyof FormState, v: string) => { setForm((f) => ({ ...f, [c]: v })); setErrores((e) => ({ ...e, [c]: '' })) }

  const cambiar = useMutation({
    mutationFn: () => authApi.cambiarPassword(form),
    onSuccess: async () => {
      toast.success('Contraseña cambiada. Inicia sesión nuevamente.')
      onClose()
      await logout()
      navigate('/login', { replace: true })
    },
    onError: (err) => {
      if (isAxiosError(err) && err.response?.status === 422) {
        const data = err.response.data
        const e: Record<string, string> = {}
        Object.entries(data?.errors ?? {}).forEach(([k, v]) => { e[k] = (v as string[])[0] })
        // El backend devuelve "contraseña actual incorrecta" como message sin errors
        if (!Object.keys(e).length && data?.message) e.current_password = data.message
        setErrores(e); toast.error(data?.message ?? 'Revisa los campos marcados')
      } else toast.error('No se pudo cambiar la contraseña')
    },
  })

  const onSubmit = (ev: FormEvent) => {
    ev.preventDefault()
    const e: Record<string, string> = {}
    if (!form.current_password) e.current_password = 'Requerido'
    if (!form.new_password) e.new_password = 'Requerido'
    if (form.new_password && form.new_password !== form.new_password_confirmation) e.new_password_confirmation = 'Las contraseñas no coinciden'
    if (Object.keys(e).length) { setErrores(e); return }
    cambiar.mutate()
  }

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} title="Cambiar contraseña"
      footer={<>
        <button type="button" className="btn" onClick={onClose} disabled={cambiar.isPending}>Cancelar</button>
        <button type="submit" form="password-form" className="btn btn-primary" disabled={cambiar.isPending}>
          {cambiar.isPending && <Loader2 size={14} className="spin" />}Cambiar contraseña
        </button>
      </>}>
      <form id="password-form" onSubmit={onSubmit} className="form-grid">
        <Campo label="Contraseña actual" req error={errores.current_password} col2>
          <PasswordInput value={form.current_password} onChange={(v) => set('current_password', v)}
            autoComplete="current-password" invalid={!!errores.current_password} />
        </Campo>
        <Campo label="Nueva contraseña" req error={errores.new_password} col2>
          <PasswordInput value={form.new_password} onChange={(v) => set('new_password', v)}
            autoComplete="new-password" invalid={!!errores.new_password} />
        </Campo>
        <Campo label="Confirmar nueva contraseña" req error={errores.new_password_confirmation} col2>
          <PasswordInput value={form.new_password_confirmation} onChange={(v) => set('new_password_confirmation', v)}
            autoComplete="new-password" invalid={!!errores.new_password_confirmation} />
        </Campo>
        <div className="col-2 muted" style={{ fontSize: 11.5 }}>
          Mínimo 8 caracteres, con mayúsculas, minúsculas, números y símbolos. Al cambiarla se cerrará tu sesión.
        </div>
      </form>
    </Modal>
  )
}

function PasswordInput({ value, onChange, autoComplete, invalid }: {
  value: string; onChange: (v: string) => void; autoComplete: string; invalid?: boolean
}) {
  const [ver, setVer] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <input className="form-input" type={ver ? 'text' : 'password'} autoComplete={autoComplete}
        value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={invalid}
        style={{ paddingRight: 38 }} />
      <button type="button" className="icon-btn" tabIndex={-1} title={ver ? 'Ocultar' : 'Mostrar'}
        onClick={() => setVer((v) => !v)}
        style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', width: 28, height: 28 }}>
        {ver ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  )
}

function Campo({ label, req, error, children, col2 }: { label: string; req?: boolean; error?: string; children: ReactNode; col2?: boolean }) {
  return (
    <div className={'form-field' + (col2 ? ' col-2' : '')}>
      <label>{label}{req && <span className="req"> *</span>}</label>
      {children}
      {error && <span className="form-error">{error}</span>}
    </div>
  )
}
