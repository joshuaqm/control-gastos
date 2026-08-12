import { Bell, Menu, Moon, Search, Sun } from 'lucide-react'
import { type ScreenId } from '@/config/navigation'
import NotificationsPanel from '@/components/layout/NotificationsPanel'
import type { NotificationsController } from '@/hooks/useNotifications'

export default function Header({
  onToggleSidebar,
  onOpenMenu,
  darkMode,
  onToggleDark,
  userName,
  sidebarOffset = 0,
  notifs,
  onNavigate,
}: {
  onToggleSidebar: () => void
  onOpenMenu: () => void
  darkMode: boolean
  onToggleDark: () => void
  userName?: string
  sidebarOffset?: number
  notifs: NotificationsController
  onNavigate: (screen: ScreenId) => void
}) {
  return (
    <header
      className="h-14 flex items-center gap-4 px-4 flex-shrink-0"
      style={{
        position: 'fixed',
        top: 0,
        left: sidebarOffset,
        right: 0,
        zIndex: 40,
        paddingTop: 'env(safe-area-inset-top)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(10,10,15,0.8)',
        backdropFilter: 'blur(20px)',
        transition: 'left 0.3s ease',
      }}
    >
      <button onClick={onOpenMenu} className="p-2 rounded-lg transition-colors hover:bg-white/10 sm:hidden flex items-center justify-center" aria-label="Menú">
        <Menu size={20} style={{ color: '#A0A0B8' }} />
      </button>
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
        <button onClick={onToggleDark} className="p-2 rounded-lg hover:bg-white/10 transition-colors cursor-not-allowed" disabled>
          {darkMode ? <Sun size={18} style={{ color: '#F59E0B' }} /> : <Moon size={18} style={{ color: '#A0A0B8' }} />}
        </button>
        <div className="relative">
          {notifs.open && (
            <div
              className="fixed inset-0 z-40"
              style={{ background: 'transparent' }}
              onClick={notifs.close}
              aria-hidden="true"
            />
          )}
          <button
            onClick={notifs.toggle}
            className="relative p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Notificaciones"
          >
            <Bell size={18} style={{ color: notifs.open ? '#7C3AED' : '#A0A0B8' }} />
            {notifs.enabled && notifs.unreadCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{ background: '#EF4444', color: '#fff' }}
              >
                {notifs.unreadCount}
              </span>
            )}
          </button>
          <NotificationsPanel
            open={notifs.open}
            reminders={notifs.reminders}
            enabled={notifs.enabled}
            loading={notifs.loading}
            onClose={notifs.close}
            onNavigate={onNavigate}
            onMarkAllRead={notifs.markAllRead}
          />
        </div>
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