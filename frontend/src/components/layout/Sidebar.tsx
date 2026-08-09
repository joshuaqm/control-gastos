import { LogOut, TrendingUp } from 'lucide-react'
import { navItems, type ScreenId } from '@/config/navigation'

export default function Sidebar({ 
  active, 
  setActive, 
  onLogout, 
  collapsed,
}: {
  active: ScreenId
  setActive: (s: ScreenId) => void
  onLogout: () => void
  collapsed: boolean
}) {
  return (
    <aside
      className="flex flex-col"
      style={{
        width: collapsed ? 0 : 220,
        minWidth: collapsed ? 0 : 220,
        height: '100%',
        background: '#14141E',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
      }}
    >
      {/* Contenido del sidebar - ahora con padding-top incluido */}
      <div className="flex flex-col h-full">
        {/* Logo - siempre visible arriba */}
        <div className="p-5 flex items-center gap-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg,#7C3AED,#5B21B6)' }}>
            <TrendingUp size={16} color="white" />
          </div>
          <span className="font-bold text-base whitespace-nowrap">XOXO Finanzas</span>
        </div>

        {/* Navegación - scrollable si hay muchos items */}
        <nav className="flex-1 p-3 flex flex-col gap-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon

            return (
              <button
                key={item.id}
                onClick={() => setActive(item.id)}
                disabled={item.disabled}
                className={`nav-item w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-left whitespace-nowrap flex-shrink-0 ${
                  active === item.id ? 'active' : ''
                } ${item.disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                style={{
                  color: active === item.id ? '#A78BFA' : '#A0A0B8',
                }}
              >
                <Icon size={18} className="flex-shrink-0" />
                {item.label}
              </button>
            )
          })}
        </nav>

        {/* Botón de cerrar sesión - siempre fijo abajo */}
        <div className="p-3 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={onLogout}
            className="nav-item w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium"
            style={{ color: '#6B6B85' }}
          >
            <LogOut size={18} />
            <span className="whitespace-nowrap">Cerrar Sesión</span>
          </button>
        </div>
      </div>
    </aside>
  )
}