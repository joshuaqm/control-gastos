import { useState } from 'react'
import { Eye, EyeOff, TrendingUp } from 'lucide-react'
import StarField from '@/components/ui/StarField'
import LegalModal from '@/components/ui/LegalModal'
import { TERMS_VERSION, LOGIN_DISCLAIMER, TERMS_AND_CONDITIONS, PRIVACY_POLICY } from '@/data/legalTexts'
import { login, type AuthResponse } from '@/api/auth'

export default function LoginScreen({
  onLogin,
}: {
  onLogin: (res: AuthResponse) => void
}) {
  const [showPass, setShowPass] = useState(false)
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [legalDoc, setLegalDoc] = useState<'terms' | 'privacy' | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await login(email.trim(), pass)
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
          <h1 className="text-2xl font-bold tracking-tight">XOXO Finanzas</h1>
          <p className="text-sm mt-1" style={{ color: '#A0A0B8' }}>Finanzas inteligentes</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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

          <button type="button" className="text-xs text-right transition-colors" style={{ color: '#7C3AED' }}>
            ¿Olvidaste tu contraseña?
          </button>

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={e => setAcceptedTerms(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded accent-[#7C3AED]"
            />
            <span className="text-xs" style={{ color: '#A0A0B8' }}>
              Acepto los{' '}
              <button type="button" onClick={() => setLegalDoc('terms')} className="underline font-medium" style={{ color: '#7C3AED' }}>
                Términos y Condiciones
              </button>
              {' '}y la{' '}
              <button type="button" onClick={() => setLegalDoc('privacy')} className="underline font-medium" style={{ color: '#7C3AED' }}>
                Política de Privacidad
              </button>
              {' '}y Tratamiento de Datos.
            </span>
          </label>

          <button
            type="submit"
            disabled={loading || !acceptedTerms}
            className="btn-primary w-full py-3 rounded-xl font-semibold text-sm mt-2 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            ) : 'Iniciar Sesión'}
          </button>
        </form>

        <p className="text-[11px] leading-relaxed mt-5" style={{ color: '#6B6B85' }}>
          {LOGIN_DISCLAIMER}
        </p>
      </div>

      <LegalModal
        open={legalDoc === 'terms'}
        title="Términos y Condiciones"
        content={TERMS_AND_CONDITIONS}
        onClose={() => setLegalDoc(null)}
      />
      <LegalModal
        open={legalDoc === 'privacy'}
        title="Política de Privacidad"
        content={PRIVACY_POLICY}
        onClose={() => setLegalDoc(null)}
      />
    </div>
  )
}
