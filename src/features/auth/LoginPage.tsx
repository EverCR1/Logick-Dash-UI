import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, LogIn, Loader2, AlertCircle } from 'lucide-react'
import { isAxiosError } from 'axios'
import { useAuth } from '@/lib/auth'
import { Logo } from '@/components/Logo'
import { brand } from '@/config/brand'
import type { LoginPayload } from '@/types/auth'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [identificador, setIdentificador] = useState('')
  const [password, setPassword] = useState('')
  const [verPassword, setVerPassword] = useState(false)
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!identificador.trim() || !password) return

    setEnviando(true)
    setError('')

    // El identificador puede ser correo o usuario; el backend acepta ambos
    const payload: LoginPayload = identificador.includes('@')
      ? { email: identificador.trim(), password }
      : { username: identificador.trim(), password }

    try {
      await login(payload)
      navigate('/', { replace: true })
    } catch (err) {
      const msg = isAxiosError(err)
        ? err.response?.data?.message ?? 'No se pudo iniciar sesión.'
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
          {/* Logo */}
          <div className="login-logo">
            <div className="login-logo-ring"><Logo size={150} /></div>
            <div className="login-brand">{brand.name}</div>
            <div className="login-tagline">{brand.tagline}</div>
          </div>

          {/* Divider */}
          <div className="login-divider"><span>Acceso al sistema</span></div>

          {/* Error */}
          {error && (
            <div className="login-alert">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="field-wrap">
              <label className="field-label" htmlFor="identificador">Email o usuario</label>
              <div className="field-input-wrap">
                <Mail className="field-icon" size={15} />
                <input
                  id="identificador"
                  type="text"
                  className={'field-input' + (error ? ' is-invalid' : '')}
                  value={identificador}
                  onChange={(e) => setIdentificador(e.target.value)}
                  placeholder="usuario@empresa.com"
                  autoComplete="username"
                  autoFocus
                />
              </div>
            </div>

            <div className="field-wrap">
              <label className="field-label" htmlFor="password">Contraseña</label>
              <div className="field-input-wrap">
                <Lock className="field-icon" size={15} />
                <input
                  id="password"
                  type={verPassword ? 'text' : 'password'}
                  className={'field-input has-eye' + (error ? ' is-invalid' : '')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button type="button" className="field-eye" tabIndex={-1}
                  onClick={() => setVerPassword((v) => !v)} title={verPassword ? 'Ocultar' : 'Mostrar'}>
                  {verPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <Link to="/password/forgot" className="login-forgot">¿Olvidaste tu contraseña?</Link>

            <button type="submit" className="btn-submit" disabled={enviando}>
              {enviando ? <Loader2 size={16} className="spin" /> : <LogIn size={16} />}
              {enviando ? 'Ingresando…' : 'Iniciar sesión'}
            </button>
          </form>
        </div>

        <div className="login-footer">© {brand.year} {brand.name} · Todos los derechos reservados</div>
      </div>
    </div>
  )
}
