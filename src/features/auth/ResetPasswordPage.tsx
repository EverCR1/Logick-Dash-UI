import { useState, type FormEvent } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, KeyRound, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react'
import { isAxiosError } from 'axios'
import { authApi } from '@/lib/api/auth'
import { Logo } from '@/components/Logo'
import { brand } from '@/config/brand'

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>()
  const [searchParams] = useSearchParams()

  const [email, setEmail] = useState(searchParams.get('email') ?? '')
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [ver, setVer] = useState(false)
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [listo, setListo] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim()) { setError('Ingresa tu correo electrónico.'); return }
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return }
    if (password !== confirmar) { setError('Las contraseñas no coinciden.'); return }
    if (!token) { setError('El enlace de recuperación no es válido.'); return }

    setEnviando(true)
    setError('')
    try {
      await authApi.restablecerPassword({
        email: email.trim(), token,
        password, password_confirmation: confirmar,
      })
      setListo(true)
    } catch (err) {
      const msg = isAxiosError(err)
        ? err.response?.data?.message ?? 'No se pudo restablecer la contraseña.'
        : 'Error de conexión con el servidor.'
      setError(msg)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="login-screen">
      <div className="bg-layer"><div className="bg-grid" /></div>

      <div className="login-wrap">
        <div className="login-card">
          <div className="login-logo">
            <div className="login-logo-ring"><Logo size={150} /></div>
            <div className="login-brand">{brand.name}</div>
            <div className="login-tagline">{brand.tagline}</div>
          </div>

          <div className="login-divider"><span>Nueva contraseña</span></div>

          {listo ? (
            <>
              <div className="login-alert" data-tone="ok">
                <CheckCircle2 size={15} />
                <span>Contraseña actualizada correctamente. Ya puedes iniciar sesión.</span>
              </div>
              <Link to="/login" className="btn-submit" style={{ textDecoration: 'none' }}>
                <ArrowLeft size={16} /> Ir a iniciar sesión
              </Link>
            </>
          ) : (
            <>
              {error && (
                <div className="login-alert">
                  <AlertCircle size={15} />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="field-wrap">
                  <label className="field-label" htmlFor="email">Correo electrónico</label>
                  <div className="field-input-wrap">
                    <Mail className="field-icon" size={15} />
                    <input
                      id="email"
                      type="email"
                      className="field-input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="usuario@empresa.com"
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="field-wrap">
                  <label className="field-label" htmlFor="password">Nueva contraseña</label>
                  <div className="field-input-wrap">
                    <Lock className="field-icon" size={15} />
                    <input
                      id="password"
                      type={ver ? 'text' : 'password'}
                      className="field-input has-eye"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      autoComplete="new-password"
                      autoFocus
                    />
                    <button type="button" className="field-eye" tabIndex={-1}
                      onClick={() => setVer((v) => !v)} title={ver ? 'Ocultar' : 'Mostrar'}>
                      {ver ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div className="field-wrap">
                  <label className="field-label" htmlFor="confirmar">Confirmar contraseña</label>
                  <div className="field-input-wrap">
                    <Lock className="field-icon" size={15} />
                    <input
                      id="confirmar"
                      type={ver ? 'text' : 'password'}
                      className="field-input"
                      value={confirmar}
                      onChange={(e) => setConfirmar(e.target.value)}
                      placeholder="Repite la contraseña"
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                <button type="submit" className="btn-submit" disabled={enviando}>
                  {enviando ? <Loader2 size={16} className="spin" /> : <KeyRound size={16} />}
                  {enviando ? 'Guardando…' : 'Restablecer contraseña'}
                </button>
              </form>

              <Link to="/login" className="login-link" style={{ marginTop: 16 }}>
                <ArrowLeft size={14} /> Volver al inicio de sesión
              </Link>
            </>
          )}
        </div>

        <div className="login-footer">© {brand.year} {brand.name} · Todos los derechos reservados</div>
      </div>
    </div>
  )
}
