import { useState } from 'react'
import { Eye, EyeOff, TrendingUp, CheckCircle } from 'lucide-react'
import StarField from '@/components/ui/StarField'
import { resetPassword } from '@/api/auth'

export default function ResetPasswordScreen() {
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const token = new URLSearchParams(window.location.search).get('token')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!token) {
      setError('Token no válido o no proporcionado.')
      return
    }
    if (newPass.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (newPass !== confirmPass) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)
    try {
      await resetPassword(token, newPass)
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al restablecer la contraseña')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: '#0A0A0F' }}>
        <StarField count={120} />
        <div className="glass-light rounded-2xl p-8 w-full max-w-md relative z-10 animate-slide-up text-center" style={{ border: '1px solid rgba(239,68,68,0.3)' }}>
          <p className="text-sm" style={{ color: '#F87171' }}>Token no válido o no proporcionado.</p>
          <a href="/" className="inline-block mt-4 px-4 py-2 rounded-xl text-xs font-medium" style={{ background: 'rgba(255,255,255,0.06)', color: '#A0A0B8' }}>
            Volver al inicio
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: '#0A0A0F' }}>
      <StarField count={120} />
      <div className="nebula" style={{ width: 500, height: 500, top: '-100px', left: '-100px', background: 'rgba(124,58,237,0.12)' }} />
      <div className="nebula" style={{ width: 400, height: 400, bottom: '-80px', right: '-80px', background: 'rgba(6,214,160,0.08)' }} />

      <div className="glass-light rounded-2xl p-8 w-full max-w-md relative z-10 animate-slide-up" style={{ border: '1px solid rgba(124,58,237,0.2)' }}>
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 animate-pulse-glow" style={{ background: 'linear-gradient(135deg, #7C3AED, #5B21B6)' }}>
            <TrendingUp size={28} color="white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">XOXO Finanzas</h1>
          <p className="text-sm mt-1" style={{ color: '#A0A0B8' }}>Restablecer contraseña</p>
        </div>

        {success ? (
          <div className="text-center py-4">
            <CheckCircle size={48} className="mx-auto mb-3" style={{ color: '#06D6A0' }} />
            <p className="text-sm mb-1" style={{ color: '#fff' }}>Contraseña actualizada</p>
            <p className="text-xs mb-4" style={{ color: '#A0A0B8' }}>
              Tu contraseña ha sido restablecida correctamente.
            </p>
            <a
              href="/"
              className="inline-block w-full py-3 rounded-xl font-semibold text-sm text-center"
              style={{ background: 'linear-gradient(135deg,#7C3AED,#5B21B6)', color: '#fff' }}
            >
              Iniciar Sesión
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#A0A0B8' }}>Nueva contraseña</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={newPass}
                  onChange={e => setNewPass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-12 rounded-xl text-sm"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                />
                <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#6B6B85' }}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#A0A0B8' }}>Confirmar contraseña</label>
              <input
                type={showPass ? 'text' : 'password'}
                value={confirmPass}
                onChange={e => setConfirmPass(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl text-sm"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              />
            </div>

            {error && (
              <div className="px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#F87171' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !newPass || !confirmPass}
              className="btn-primary w-full py-3 rounded-xl font-semibold text-sm mt-2 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : 'Restablecer contraseña'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
