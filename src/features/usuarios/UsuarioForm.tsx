import { useState, useEffect, type ReactNode, type FormEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { Loader2, Mail, AtSign, Phone, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { usuariosApi, catalogosApi } from '@/lib/api'
import type { Usuario, UsuarioPayload } from '@/types/usuario'

type FormState = Record<string, string>
const SIN_SUC = 'none'
const VACIO: FormState = {
  nombres: '', apellidos: '', email: '', username: '', password: '',
  rol: 'vendedor', estado: 'activo', telefono: '', direccion: '', sucursal_id: SIN_SUC,
}

export function UsuarioForm({ open, onClose, usuario }: {
  open: boolean; onClose: () => void; usuario: Usuario | null
}) {
  const queryClient = useQueryClient()
  const editar = !!usuario
  const [form, setForm] = useState<FormState>(VACIO)
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [verPass, setVerPass] = useState(false)

  const { data: sucursales = [] } = useQuery({
    queryKey: ['sucursales-activas'], queryFn: catalogosApi.sucursalesActivas, staleTime: 1000 * 60 * 10, enabled: open,
  })

  useEffect(() => {
    if (!open) return
    setForm(usuario ? {
      nombres: usuario.nombres, apellidos: usuario.apellidos, email: usuario.email, username: usuario.username,
      password: '', rol: usuario.rol, estado: usuario.estado, telefono: usuario.telefono ?? '',
      direccion: usuario.direccion ?? '', sucursal_id: usuario.sucursal_id ? String(usuario.sucursal_id) : SIN_SUC,
    } : VACIO)
    setErrores({}); setVerPass(false)
  }, [open, usuario])

  const set = (c: string, v: string) => { setForm((f) => ({ ...f, [c]: v })); setErrores((e) => ({ ...e, [c]: '' })) }

  const guardar = useMutation({
    mutationFn: () => {
      const payload: UsuarioPayload = {
        nombres: form.nombres.trim(), apellidos: form.apellidos.trim(), email: form.email.trim(),
        username: form.username.trim(), rol: form.rol as UsuarioPayload['rol'], estado: form.estado as 'activo' | 'inactivo',
        telefono: form.telefono.trim() || null, direccion: form.direccion.trim() || null,
        sucursal_id: form.sucursal_id !== SIN_SUC ? Number(form.sucursal_id) : null,
      }
      if (form.password) payload.password = form.password
      return editar ? usuariosApi.actualizar(usuario!.id, payload) : usuariosApi.crear(payload)
    },
    onSuccess: () => {
      toast.success(editar ? 'Usuario actualizado' : 'Usuario creado')
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
      if (usuario) queryClient.invalidateQueries({ queryKey: ['usuario', String(usuario.id)] })
      onClose()
    },
    onError: (err) => {
      if (isAxiosError(err) && err.response?.status === 422) {
        const e: Record<string, string> = {}
        Object.entries(err.response.data?.errors ?? {}).forEach(([k, v]) => { e[k] = (v as string[])[0] })
        setErrores(e); toast.error('Revisa los campos marcados')
      } else toast.error('No se pudo guardar el usuario')
    },
  })

  const validar = () => {
    const e: Record<string, string> = {}
    if (!form.nombres.trim()) e.nombres = 'Requerido'
    if (!form.apellidos.trim()) e.apellidos = 'Requerido'
    if (!form.email.trim()) e.email = 'Requerido'
    if (!form.username.trim()) e.username = 'Requerido'
    if (!editar && !form.password) e.password = 'Requerida para usuarios nuevos'
    setErrores(e); return Object.keys(e).length === 0
  }
  const onSubmit = (ev: FormEvent) => { ev.preventDefault(); if (!validar()) return; guardar.mutate() }

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()}
      title={editar ? 'Editar usuario' : 'Nuevo usuario'}
      description={editar ? `Modificando @${usuario?.username}` : 'Crea una cuenta con acceso al sistema'}
      footer={<>
        <span style={{ marginRight: 'auto', fontSize: 12, color: 'var(--text-faint)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <AlertCircle size={13} /> Los campos con <span style={{ color: 'var(--neg)', fontWeight: 600 }}>*</span> son obligatorios
        </span>
        <button type="button" className="btn" onClick={onClose} disabled={guardar.isPending}>Cancelar</button>
        <button type="submit" form="usuario-form" className="btn btn-primary" disabled={guardar.isPending}>
          {guardar.isPending && <Loader2 size={14} className="spin" />}{editar ? 'Guardar cambios' : 'Crear usuario'}
        </button>
      </>}>
      <form id="usuario-form" onSubmit={onSubmit} className="form-grid">
        <Campo label="Nombres" req error={errores.nombres}>
          <input className="form-input" value={form.nombres} onChange={(e) => set('nombres', e.target.value)} aria-invalid={!!errores.nombres} placeholder="Nombres" />
        </Campo>
        <Campo label="Apellidos" req error={errores.apellidos}>
          <input className="form-input" value={form.apellidos} onChange={(e) => set('apellidos', e.target.value)} aria-invalid={!!errores.apellidos} placeholder="Apellidos" />
        </Campo>
        <Campo label="Correo" req error={errores.email}>
          <IconInput icon={<Mail size={15} />} type="email" value={form.email} onChange={(v) => set('email', v)} invalid={!!errores.email} placeholder="correo@logick.com" />
        </Campo>
        <Campo label="Usuario" req error={errores.username}>
          <IconInput icon={<AtSign size={15} />} value={form.username} onChange={(v) => set('username', v)} invalid={!!errores.username} placeholder="usuario" />
        </Campo>
        <Campo label={editar ? 'Contraseña' : 'Contraseña'} req={!editar} error={errores.password} col2
          hint="Mín. 8 caracteres, mayús/minús, número y símbolo">
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span style={{ position: 'absolute', left: 11, display: 'flex', color: 'var(--text-faint)', pointerEvents: 'none' }}><Lock size={15} /></span>
            <input className="form-input" style={{ paddingLeft: 34, paddingRight: 38 }} type={verPass ? 'text' : 'password'}
              value={form.password} onChange={(e) => set('password', e.target.value)} aria-invalid={!!errores.password}
              placeholder={editar ? 'Dejar en blanco para no cambiar' : '••••••••'} autoComplete="new-password" />
            <button type="button" className="icon-btn" tabIndex={-1} title={verPass ? 'Ocultar' : 'Mostrar'}
              onClick={() => setVerPass((v) => !v)}
              style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', width: 28, height: 28 }}>
              {verPass ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </Campo>
        <Campo label="Rol" req error={errores.rol}>
          <Select value={form.rol} onValueChange={(v) => set('rol', v)}
            options={[{ value: 'administrador', label: 'Administrador' }, { value: 'vendedor', label: 'Vendedor' }, { value: 'analista', label: 'Analista' }]} />
        </Campo>
        <Campo label="Estado" error={errores.estado}>
          <Select value={form.estado} onValueChange={(v) => set('estado', v)} options={[{ value: 'activo', label: 'Activo' }, { value: 'inactivo', label: 'Inactivo' }]} />
        </Campo>
        <Campo label="Teléfono" error={errores.telefono}>
          <IconInput icon={<Phone size={15} />} value={form.telefono} onChange={(v) => set('telefono', v)} placeholder="0000-0000" />
        </Campo>
        <Campo label="Sucursal" error={errores.sucursal_id}>
          <Select value={form.sucursal_id} onValueChange={(v) => set('sucursal_id', v)}
            options={[{ value: SIN_SUC, label: 'Sin sucursal' }, ...sucursales.map((s) => ({ value: String(s.id), label: s.nombre }))]} />
        </Campo>
        <Campo label="Dirección" error={errores.direccion} col2>
          <textarea className="form-textarea" value={form.direccion} onChange={(e) => set('direccion', e.target.value)} placeholder="Calle, zona, municipio, departamento…" />
        </Campo>
      </form>
    </Modal>
  )
}

function IconInput({ icon, value, onChange, invalid, type = 'text', placeholder }: {
  icon: ReactNode; value: string; onChange: (v: string) => void; invalid?: boolean; type?: string; placeholder?: string
}) {
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <span style={{ position: 'absolute', left: 11, display: 'flex', color: 'var(--text-faint)', pointerEvents: 'none' }}>{icon}</span>
      <input className="form-input" style={{ paddingLeft: 34 }} type={type} value={value}
        onChange={(e) => onChange(e.target.value)} aria-invalid={invalid} placeholder={placeholder} />
    </div>
  )
}

function Campo({ label, req, error, children, col2, hint }: { label: string; req?: boolean; error?: string; children: ReactNode; col2?: boolean; hint?: string }) {
  return (
    <div className={'form-field' + (col2 ? ' col-2' : '')}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {label}{req && <span className="req"> *</span>}
        {hint && <span style={{ marginLeft: 'auto', fontWeight: 400, fontSize: 11, color: 'var(--text-faint)' }}>{hint}</span>}
      </label>
      {children}
      {error && <span className="form-error">{error}</span>}
    </div>
  )
}
