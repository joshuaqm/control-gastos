import { type ScreenId } from '@/config/navigation'
import { navItems } from '@/config/navigation'

export default function MobileNav({ active, setActive }: {
  active: ScreenId
  setActive: (s: ScreenId) => void
}) {
  const items = navItems.slice(0, 5)
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around px-2 py-2 sm:hidden"
      style={{ background: '#14141E', borderTop: '1px solid rgba(255,255,255,0.08)' }}
    >
      {items.map(item => {
        const Icon = item.icon
        const isActive = active === item.id
        return (
          <button
            key={item.id}
            onClick={() => setActive(item.id)}
            className="flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all"
            style={{ color: isActive ? '#A78BFA' : '#6B6B85' }}
          >
            <Icon size={20} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}