import { LogOut, TrendingUp, X } from 'lucide-react'
import { navItems, type ScreenId } from '@/config/navigation'

export default function MobileMenu({ open, active, onSelect, onClose, onLogout, userName }: {
  open: boolean
  active: ScreenId
  onSelect: (id: ScreenId) => void
  onClose: () => void
  onLogout: () => void
  userName?: string
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 sm:hidden">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div className="absolute left-0 top-0 bottom-0 w-72 glass animate-slide-left flex flex-col" style={{ background: '#14141E' }}>
        <div className="p-5 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg,#7C3AED,#5B21B6)' }}>
              <TrendingUp size={16} color="white" />
            </div>
            <div>
              <p className="font-bold text-sm">FinanceAI</p>
              <p className="text-xs" style={{ color: '#6B6B85' }}>{userName || 'Usuario'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors" style={{ color: '#A0A0B8' }} aria-label="Cerrar menú">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 p-3 flex flex-col gap-1 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon
            const isActive = active === item.id
            return (
              <button
                key={item.id}
                onClick={() => onSelect(item.id)}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors"
                style={{ background: isActive ? 'rgba(124,58,237,0.2)' : 'transparent', color: isActive ? '#A78BFA' : '#A0A0B8' }}
              >
                <Icon size={18} className="flex-shrink-0" />
                {item.label}
              </button>
            )
          })}
        </nav>

        <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors"
            style={{ color: '#F87171' }}
          >
            <LogOut size={18} />
            Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  )
}