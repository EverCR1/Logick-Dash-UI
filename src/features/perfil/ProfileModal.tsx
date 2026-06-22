import { useState, useEffect, type ReactNode, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { authApi } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { fmtFecha } from '@/lib/format'

const ROL_LABEL: Record<string, string> = {
  administrador: 'Administrador', vendedor: 'Vendedor', analista: 'Analista',
}

function iniciales(nombres: string, apellidos: string): string {
  return ((nombres[0] ?? '') + (apellidos[0] ?? '')).toUpperCase() || 'U'
}

type FormState = Record<string, string>

export function ProfileModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { usuario, refrescarPerfil } = useAuth()
  const [form, setForm] = useState<FormState>({})
  const [errores, setErrores] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open && usuario) {
      setForm({
        nombres: usuario.nombres, apellidos: usuario.apellidos, email: usuario.email,
        username: usuario.username, telefono: usuario.telefono ?? '', direccion: usuario.direccion ?? '',
      })
      setErrores({})
    }
  }, [open, usuario])

  const set = (c: string, v: string) => { setForm((f) => ({ ...f, [c]: v })); setErrores((e) => ({ ...e, [c]: '' })) }

  const guardar = useMutation({
    mutationFn: () => authApi.actualizarPerfil({
      nombres: form.nombres.trim(), apellidos: form.apellidos.trim(),
      email: form.email.trim(), username: form.username.trim(),
      telefono: form.telefono.trim() || null, direccion: form.direccion.trim() || null,
    }),
    onSuccess: async () => {
      await refrescarPerfil()
      toast.success('Perfil actualizado')
      onClose()
    },
    onError: (err) => {
      if (isAxiosError(err) && err.response?.status === 422) {
        const e: Record<string, string> = {}
        Object.entries(err.response.data?.errors ?? {}).forEach(([k, v]) => { e[k] = (v as string[])[0] })
        setErrores(e); toast.error('Revisa los campos marcados')
      } else toast.error('No se pudo actualizar el perfil')
    },
  })

  const onSubmit = (ev: FormEvent) => {
    ev.preventDefault()
    const e: Record<string, string> = {}
    if (!form.nombres?.trim()) e.nombres = 'Requerido'
    if (!form.apellidos?.trim()) e.apellidos = 'Requerido'
    if (!form.email?.trim()) e.email = 'Requerido'
    if (!form.username?.trim()) e.username = 'Requerido'
    if (Object.keys(e).length) { setErrores(e); return }
    guardar.mutate()
  }

  if (!usuario) return null

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} title="Mi perfil" size="lg"
      footer={<>
        <button type="button" className="btn" onClick={onClose} disabled={guardar.isPending}>Cancelar</button>
        <button type="submit" form="perfil-form" className="btn btn-primary" disabled={guardar.isPending}>
          {guardar.isPending && <Loader2 size={14} className="spin" />}Guardar cambios
        </button>
      </>}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingBottom: 14, borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
        <div className="avatar" style={{ width: 52, height: 52, fontSize: 18 }}>{iniciales(usuario.nombres, usuario.apellidos)}</div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{usuario.nombre_completo}</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
            <span className="badge" data-tone="info"><span className="b-dot" />{ROL_LABEL[usuario.rol] ?? usuario.rol}</span>
            <span className="badge" data-tone={usuario.estado === 'activo' ? 'pos' : undefined}><span className="b-dot" />{usuario.estado === 'activo' ? 'Activo' : 'Inactivo'}</span>
          </div>
        </div>
      </div>

      <form id="perfil-form" onSubmit={onSubmit} className="form-grid">
        <Campo label="Nombres" req error={errores.nombres}>
          <input className="form-input" value={form.nombres ?? ''} onChange={(e) => set('nombres', e.target.value)} aria-invalid={!!errores.nombres} />
        </Campo>
        <Campo label="Apellidos" req error={errores.apellidos}>
          <input className="form-input" value={form.apellidos ?? ''} onChange={(e) => set('apellidos', e.target.value)} aria-invalid={!!errores.apellidos} />
        </Campo>
        <Campo label="Email" req error={errores.email}>
          <input className="form-input" type="email" value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} aria-invalid={!!errores.email} />
        </Campo>
        <Campo label="Usuario" req error={errores.username}>
          <input className="form-input" value={form.username ?? ''} onChange={(e) => set('username', e.target.value)} aria-invalid={!!errores.username} />
        </Campo>
        <Campo label="Teléfono" error={errores.telefono}>
          <input className="form-input" value={form.telefono ?? ''} onChange={(e) => set('telefono', e.target.value)} />
        </Campo>
        <Campo label="Dirección" error={errores.direccion}>
          <input className="form-input" value={form.direccion ?? ''} onChange={(e) => set('direccion', e.target.value)} />
        </Campo>
      </form>

      <div style={{ display: 'flex', gap: 18, marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
        <span>Último acceso: <strong style={{ color: 'var(--text)' }}>{fmtFecha(usuario.last_login_at, true)}</strong></span>
        {usuario.created_at && <span>Miembro desde: <strong style={{ color: 'var(--text)' }}>{fmtFecha(usuario.created_at)}</strong></span>}
      </div>
    </Modal>
  )
}

function Campo({ label, req, error, children }: { label: string; req?: boolean; error?: string; children: ReactNode }) {
  return (
    <div className="form-field">
      <label>{label}{req && <span className="req"> *</span>}</label>
      {children}
      {error && <span className="form-error">{error}</span>}
    </div>
  )
}
