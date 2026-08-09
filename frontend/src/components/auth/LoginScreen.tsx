import { useState } from 'react'
import { Eye, EyeOff, TrendingUp } from 'lucide-react'
import StarField from '@/components/ui/StarField'
import { login, register, type AuthResponse } from '@/api/auth'

type Mode = 'login' | 'register'

export default function LoginScreen({
  onLogin,
}: {
  onLogin: (res: AuthResponse) => void
}) {
  const [mode, setMode] = useState<Mode>('login')
  const [showPass, setShowPass] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res =
        mode === 'login'
          ? await login(email.trim(), pass)
          : await register(name.trim(), email.trim(), pass)
      onLogin(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error, intenta de nuevo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: '#0A0A0F' }}>
      <StarField count={120} />
      <div className="nebula" style={{ width: 500, height: 500, top: '-100px', left: '-100px', background: 'rgba(124,58,237,0.12)' }} />
      <div className="nebula" style={{ width: 400, height: 400, bottom: '-80px', right: '-80px', background: 'rgba(6,214,160,0.08)' }} />
      <div className="nebula" style={{ width: 300, height: 300, top: '40%', left: '60%', background: 'rgba(124,58,237,0.08)' }} />

      <div className="glass-light rounded-2xl p-8 w-full max-w-md relative z-10 animate-slide-up" style={{ border: '1px solid rgba(124,58,237,0.2)' }}>
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 animate-pulse-glow" style={{ background: 'linear-gradient(135deg, #7C3AED, #5B21B6)' }}>
            <TrendingUp size={28} color="white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">FinanceAI</h1>
          <p className="text-sm mt-1" style={{ color: '#A0A0B8' }}>Tu asistente financiero inteligente</p>
        </div>

        <div className="flex rounded-xl p-1 mb-6" style={{ background: 'rgba(255,255,255,0.05)' }}>
          {(['login', 'register'] as const).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setError('') }}
              className="flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-300"
              style={mode === m ? { background: 'linear-gradient(135deg,#7C3AED,#5B21B6)', color: '#fff', boxShadow: '0 0 15px rgba(124,58,237,0.4)' } : { color: '#A0A0B8' }}
            >
              {m === 'login' ? 'Iniciar Sesión' : 'Registrarse'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#A0A0B8' }}>Nombre completo</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ana García"
                className="w-full px-4 py-3 rounded-xl text-sm"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#A0A0B8' }}>Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="ana@ejemplo.com"
              className="w-full px-4 py-3 rounded-xl text-sm transition-all"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#A0A0B8' }}>Contraseña</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={pass}
                onChange={e => setPass(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 pr-12 rounded-xl text-sm"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              />
              <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#6B6B85' }}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#F87171' }}>
              {error}
            </div>
          )}

          {mode === 'login' && (
            <button type="button" className="text-xs text-right transition-colors" style={{ color: '#7C3AED' }}>
              ¿Olvidaste tu contraseña?
            </button>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 rounded-xl font-semibold text-sm mt-2 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            ) : mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
          </button>
        </form>
      </div>
    </div>
  )
}