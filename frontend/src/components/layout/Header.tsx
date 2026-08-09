import { Bell, Menu, Moon, Search, Sun } from 'lucide-react'

export default function Header({ onToggleSidebar, darkMode, onToggleDark, onOpenChat, userName }: {
  onToggleSidebar: () => void
  darkMode: boolean
  onToggleDark: () => void
  onOpenChat: () => void
  userName?: string
}) {
  return (
    <header
      className="h-14 flex items-center gap-4 px-4 flex-shrink-0"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(10,10,15,0.8)', backdropFilter: 'blur(20px)' }}
    >
      <button onClick={onToggleSidebar} className="p-2 rounded-lg transition-colors hover:bg-white/10 hidden sm:flex items-center justify-center">
        <Menu size={20} style={{ color: '#A0A0B8' }} />
      </button>

      <div className="flex-1 hidden md:flex">
        <div className="relative w-64">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#6B6B85' }} />
          <input
            type="text"
            placeholder="Buscar transacciones..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-sm"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff' }}
          />
        </div>
      </div>

      <div className="flex-1 md:hidden" />

      <div className="flex items-center gap-2">
        <button onClick={onToggleDark} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
          {darkMode ? <Sun size={18} style={{ color: '#F59E0B' }} /> : <Moon size={18} style={{ color: '#A0A0B8' }} />}
        </button>
        <button className="relative p-2 rounded-lg hover:bg-white/10 transition-colors" onClick={onOpenChat}>
          <Bell size={18} style={{ color: '#A0A0B8' }} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ background: '#7C3AED' }} />
        </button>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold cursor-pointer"
          style={{ background: 'linear-gradient(135deg,#7C3AED,#06D6A0)' }}
          title={userName}
        >
          {(userName || 'AG').slice(0, 2).toUpperCase()}
        </div>
      </div>
    </header>
  )
}