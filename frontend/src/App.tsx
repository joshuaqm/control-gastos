import { useEffect, useState } from 'react'
import AIChat from '@/components/ai/AIChat'
import LoginScreen from '@/components/auth/LoginScreen'
import Header from '@/components/layout/Header'
import MobileMenu from '@/components/layout/MobileMenu'
import MobileNav from '@/components/layout/MobileNav'
import Sidebar from '@/components/layout/Sidebar'
import Toast from '@/components/ui/Toast'
import { type ScreenId } from '@/config/navigation'
import { type ApiUser } from '@/api/auth'
import { type AuthResponse } from '@/api/auth'
import AccountsScreen from '@/features/Accounts'
import BudgetsScreen from '@/features/Budgets'
import Dashboard from '@/features/Dashboard'
import DebtsScreen from '@/features/Debts'
import RecurringScreen from '@/features/Recurring'
import InvestmentsScreen from '@/features/Investments'
import SettingsScreen from '@/features/Settings'
import TransactionsScreen from '@/features/Transactions'
import GoalsScreen from '@/features/Goals'
import { useToasts } from '@/hooks/useToasts'

const SESSION_KEY = 'financeai.session'

const SCREEN_PATH: Record<ScreenId, string> = {
  dashboard: '/',
  accounts: '/accounts',
  transactions: '/transactions',
  budgets: '/budgets',
  goals: '/goals',
  debts: '/debts',
  recurring: '/recurring',
  investments: '/investments',
  settings: '/settings',
  assistant: '/assistant',
}

const pathToScreen: Record<string, ScreenId> = {}
for (const [id, path] of Object.entries(SCREEN_PATH)) {
  pathToScreen[path] = id as ScreenId
}

const CHAT_RIPPLE = [
  { size: '24vmax', color: '#DDD6FE', delay: 0 },
  { size: '44vmax', color: '#C4B5FD', delay: 60 },
  { size: '70vmax', color: '#A78BFA', delay: 120 },
  { size: '100vmax', color: '#8B5CF6', delay: 180 },
  { size: '140vmax', color: '#7C3AED', delay: 240 },
]

const screenFromPath = (): ScreenId => {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  return pathToScreen[path] ?? 'dashboard'
}

export default function App() {
  const [user, setUser] = useState<ApiUser | null>(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY)
      return raw ? (JSON.parse(raw) as { user: ApiUser }).user : null
    } catch {
      return null
    }
  })
  const [screen, setScreen] = useState<ScreenId>(screenFromPath)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [darkMode, setDarkMode] = useState(true)
  const [chatMsg, setChatMsg] = useState('')
  const [reveal, setReveal] = useState<'idle' | 'expanding' | 'revealing'>('idle')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { toasts, showToast, dismiss } = useToasts()

  const navigate = (next: ScreenId) => {
    setScreen(next)
    const path = SCREEN_PATH[next]
    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path)
    }
  }

  useEffect(() => {
    const onPop = () => setScreen(screenFromPath())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const handleLogin = (res: AuthResponse) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ user: res.user, token: res.token }))
    setUser(res.user)
  }

  const selectFromMenu = (id: ScreenId) => {
    setMobileMenuOpen(false)
    navigate(id)
  }

  const handleLogout = () => {
    localStorage.removeItem(SESSION_KEY)
    setUser(null)
    setScreen('dashboard')
    window.history.replaceState(null, '', SCREEN_PATH.dashboard)
  }

  const openChat = (msg?: string) => {
    setChatMsg(msg || '')
    if (screen !== 'assistant') {
      setReveal('expanding')
      navigate('assistant')
      window.setTimeout(() => setReveal('revealing'), 820)
      window.setTimeout(() => setReveal('idle'), 1400)
    }
  }

  const renderScreen = () => {
    switch (screen) {
      case 'dashboard':
        return (
          <Dashboard
            onOpenChat={openChat}
            showToast={showToast}
            onNavigate={navigate}
          />
        )
      case 'transactions':
        return <TransactionsScreen showToast={showToast} />
      case 'accounts':
        return <AccountsScreen showToast={showToast} />
      case 'budgets':
        return <BudgetsScreen />
      case 'goals':
        return <GoalsScreen showToast={showToast} />
      case 'debts':
        return <DebtsScreen showToast={showToast} />
      case 'recurring':
        return <RecurringScreen showToast={showToast} />
      case 'investments':
        return <InvestmentsScreen showToast={showToast} />
      case 'settings':
        return <SettingsScreen darkMode={darkMode} onToggleDark={() => setDarkMode(v => !v)} />
    }
  }

  useEffect(() => {
    // Responsive: collapse sidebar on mobile
    const check = () => { if (window.innerWidth < 768) setSidebarOpen(false) }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  if (!user) return <LoginScreen onLogin={handleLogin} />

  // Calcular el offset del sidebar para el header y el contenido
  const sidebarWidth = sidebarOpen ? 220 : 0

  return (
    <div style={{ background: '#0A0A0F', minHeight: '100vh' }}>
      {/* Nebula decorations */}
      <div className="nebula" style={{ width: 600, height: 600, top: -200, left: -200, background: 'rgba(124,58,237,0.05)' }} />
      <div className="nebula" style={{ width: 400, height: 400, bottom: 100, right: -100, background: 'rgba(6,214,160,0.04)' }} />

      <div className="flex flex-col" style={{ minHeight: '100vh' }}>
        {/* Header - se mueve con el sidebar */}
        <Header 
          onToggleSidebar={() => setSidebarOpen(v => !v)} 
          onOpenMenu={() => setMobileMenuOpen(true)} 
          darkMode={darkMode} 
          onToggleDark={() => setDarkMode(v => !v)} 
          userName={user?.username}
          sidebarOffset={sidebarWidth}
        />

        <div className="flex flex-1" style={{ paddingTop: '56px' }}>
          {/* Sidebar — fijo, ocupando toda la altura */}
          <div 
            className="hidden sm:block"
            style={{
              position: 'fixed',
              top: 0, // Empieza desde el tope
              left: 0,
              bottom: 0,
              zIndex: 39, // Un nivel menos que el header (40)
              flexShrink: 0,
            }}
          >
            <Sidebar 
              active={screen} 
              setActive={navigate} 
              onLogout={handleLogout} 
              collapsed={!sidebarOpen}
            />
          </div>

          {/* Main content con margen para el sidebar */}
          <main 
            className="flex-1 overflow-y-auto p-4 sm:p-6 relative" 
            style={{ 
              paddingBottom: 80,
              marginLeft: sidebarWidth,
              transition: 'margin-left 0.3s ease',
              minHeight: 'calc(100vh - 56px)',
              width: '100%',
              maxWidth: '100%',
            }}
          >
            <div className="w-full max-w-7xl mx-auto px-2 sm:px-4">
              {renderScreen()}
              <AIChat initialMsg={chatMsg} visible={screen === 'assistant' && reveal !== 'expanding'} />
            </div>
          </main>
        </div>
      </div>

      {/* Mobile nav */}
      <MobileNav active={screen} setActive={navigate} />

      {/* Mobile hamburger menu */}
      <MobileMenu
        open={mobileMenuOpen}
        active={screen}
        onSelect={selectFromMenu}
        onClose={() => setMobileMenuOpen(false)}
        onLogout={() => { setMobileMenuOpen(false); handleLogout() }}
        userName={user?.username}
      />

      {/* Chat transition */}
      {reveal !== 'idle' && (
        <div className="fixed inset-0 z-50 pointer-events-none" style={{ overflow: 'hidden' }}>
          {CHAT_RIPPLE.map((c, i) => (
            <div
              key={i}
              className="chat-circle"
              style={{
                width: c.size,
                height: c.size,
                background: c.color,
                opacity: 0,
                transform: 'translate(-50%, -50%) scale(0)',
                animationDelay: `${c.delay}ms`,
              }}
            />
          ))}
        </div>
      )}

      {/* Toasts */}
      <Toast toasts={toasts} dismiss={dismiss} />
    </div>
  )
}