import { type ScreenId } from '@/config/navigation'
import { navItems } from '@/config/navigation'

const MOBILE_IDS: ScreenId[] = ['dashboard', 'accounts', 'transactions', 'recurring', 'assistant']

export default function MobileNav({ active, setActive }: {
  active: ScreenId
  setActive: (s: ScreenId) => void
}) {
  const items = navItems.filter(item => MOBILE_IDS.includes(item.id))
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around px-2 py-2 sm:hidden"
      style={{ background: '#14141E', borderTop: '1px solid rgba(255,255,255,0.08)', paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}
    >
      {items.map(item => {
        const Icon = item.icon
        const isActive = active === item.id
        return (
          <button
            key={item.id}
            onClick={() => setActive(item.id)}
            className="flex flex-col items-center gap-1 px-2 py-1 rounded-xl transition-all"
            style={{ color: isActive ? '#A78BFA' : '#6B6B85' }}
          >
            <Icon size={20} />
            <span className="text-[10px] font-medium whitespace-nowrap">{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}