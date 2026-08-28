import { useState } from 'react'
import { X, Mail, Send } from 'lucide-react'
import { forgotPassword } from '@/api/auth'

export default function ForgotPasswordModal({
  open,
  onClose,
  showToast,
}: {
  open: boolean
  onClose: () => void
  showToast: (msg: string, kind: 'success' | 'error' | 'info') => void
}) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    try {
      const res = await forgotPassword(email.trim())
      setSent(true)
      showToast(res.message, 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al enviar el correo', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setEmail('')
    setSent(false)
    onClose()
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={handleClose}
    >
      <div
        className="glass animate-slide-up rounded-2xl p-6 w-full max-w-md"
        style={{ border: '1px solid rgba(124,58,237,0.2)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold">Recuperar contraseña</h3>
          <button onClick={handleClose} style={{ color: '#6B6B85' }}>
            <X size={20} />
          </button>
        </div>

        {sent ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: 'rgba(6,214,160,0.12)' }}>
              <Mail size={24} style={{ color: '#06D6A0' }} />
            </div>
            <p className="text-sm mb-1" style={{ color: '#fff' }}>Correo enviado</p>
            <p className="text-xs mb-4" style={{ color: '#A0A0B8' }}>
              Si el correo <strong>{email}</strong> está registrado, recibirás un enlace para restablecer tu contraseña.
            </p>
            <p className="text-[11px] mb-4" style={{ color: '#6B6B85' }}>
              Revisa tu bandeja de entrada y la carpeta de spam. El enlace expirará en 20 minutos.
            </p>
            <button
              onClick={handleClose}
              className="w-full py-3 rounded-xl text-sm font-semibold"
              style={{ background: 'linear-gradient(135deg,#7C3AED,#5B21B6)', color: '#fff' }}
            >
              Entendido
            </button>
          </div>
        ) : (
          <>
            <p className="text-xs mb-4" style={{ color: '#A0A0B8' }}>
              Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#A0A0B8' }}>
                  Correo electrónico
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="ana@ejemplo.com"
                  autoFocus
                  className="w-full px-4 py-3 rounded-xl text-sm"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg,#7C3AED,#5B21B6)', color: '#fff' }}
              >
                {loading ? (
                  <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                ) : (
                  <>
                    <Send size={14} />
                    Enviar enlace de recuperación
                  </>
                )}
              </button>
            </form>

            <button
              onClick={handleClose}
              className="w-full py-2 mt-2 rounded-xl text-xs font-medium"
              style={{ color: '#6B6B85' }}
            >
              Cancelar
            </button>
          </>
        )}
      </div>
    </div>
  )
}
