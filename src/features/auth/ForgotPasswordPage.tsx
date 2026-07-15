import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Send, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react'
import { isAxiosError } from 'axios'
import { authApi } from '@/lib/api/auth'
import { Logo } from '@/components/Logo'
import { brand } from '@/config/brand'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setEnviando(true)
    setError('')
    try {
      await authApi.solicitarReset(email.trim())
      setEnviado(true)
    } catch (err) {
      const msg = isAxiosError(err)
        ? err.response?.data?.message ?? 'No se pudo procesar la solicitud.'
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

          <div className="login-divider"><span>Recuperar contraseña</span></div>

          {enviado ? (
            <>
              <div className="login-alert" data-tone="ok">
                <CheckCircle2 size={15} />
                <span>Si el correo está registrado, recibirás las instrucciones en breve. Revisa tu bandeja y spam.</span>
              </div>
              <Link to="/login" className="btn-submit" style={{ textDecoration: 'none' }}>
                <ArrowLeft size={16} /> Volver al inicio de sesión
              </Link>
            </>
          ) : (
            <>
              <p className="muted" style={{ fontSize: 12.5, textAlign: 'center', margin: '0 0 16px' }}>
                Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
              </p>

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
                      className={'field-input' + (error ? ' is-invalid' : '')}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="usuario@empresa.com"
                      autoComplete="email"
                      autoFocus
                    />
                  </div>
                </div>

                <button type="submit" className="btn-submit" disabled={enviando}>
                  {enviando ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
                  {enviando ? 'Enviando…' : 'Enviar enlace'}
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
