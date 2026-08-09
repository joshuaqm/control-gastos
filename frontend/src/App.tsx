import { useEffect, useState } from 'react'
import AIChat from '@/components/ai/AIChat'
import LoginScreen from '@/components/auth/LoginScreen'
import Header from '@/components/layout/Header'
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
import InvestmentsScreen from '@/features/Investments'
import SettingsScreen from '@/features/Settings'
import TransactionsScreen from '@/features/Transactions'
import { useToasts } from '@/hooks/useToasts'

const SESSION_KEY = 'financeai.session'

const SCREEN_PATH: Record<ScreenId, string> = {
  dashboard: '/',
  accounts: '/accounts',
  transactions: '/transactions',
  budgets: '/budgets',
  debts: '/debts',
  investments: '/investments',
  settings: '/settings',
  assistant: '/assistant',
}

const pathToScreen: Record<string, ScreenId> = {}
for (const [id, path] of Object.entries(SCREEN_PATH)) {
  pathToScreen[path] = id as ScreenId
}

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

  const handleLogout = () => {
    localStorage.removeItem(SESSION_KEY)
    setUser(null)
    setScreen('dashboard')
    window.history.replaceState(null, '', SCREEN_PATH.dashboard)
  }

  const openChat = (msg?: string) => {
    setChatMsg(msg || '')
    navigate('assistant')
  }

  const renderScreen = () => {
    switch (screen) {
      case 'dashboard':
        return <Dashboard onOpenChat={openChat} showToast={showToast} />
      case 'transactions':
        return <TransactionsScreen showToast={showToast} />
      case 'accounts':
        return <AccountsScreen showToast={showToast} />
      case 'budgets':
        return <BudgetsScreen />
      case 'debts':
        return <DebtsScreen showToast={showToast} />
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

  return (
    <div style={{ background: '#0A0A0F', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Nebula decorations */}
      <div className="nebula" style={{ width: 600, height: 600, top: -200, left: -200, background: 'rgba(124,58,237,0.05)' }} />
      <div className="nebula" style={{ width: 400, height: 400, bottom: 100, right: -100, background: 'rgba(6,214,160,0.04)' }} />

      <Header onToggleSidebar={() => setSidebarOpen(v => !v)} darkMode={darkMode} onToggleDark={() => setDarkMode(v => !v)} onOpenChat={openChat} userName={user?.username} />

      <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        {/* Sidebar — hidden on mobile */}
        <div className="hidden sm:flex flex-col" style={{ flexShrink: 0 }}>
          <Sidebar active={screen} setActive={navigate} onLogout={handleLogout} collapsed={!sidebarOpen} />
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 relative" style={{ paddingBottom: 80 }}>
          <div className="max-w-5xl mx-auto">
            {renderScreen()}
            {/* AI Chat — rendered as a section, kept mounted to preserve conversation */}
            <AIChat initialMsg={chatMsg} visible={screen === 'assistant'} />
          </div>
        </main>
      </div>

      {/* Mobile nav */}
      <MobileNav active={screen} setActive={navigate} />

      {/* Toasts */}
      <Toast toasts={toasts} dismiss={dismiss} />
    </div>
  )
}