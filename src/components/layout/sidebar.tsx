'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Mic, MessageSquare, HandCoins,
  PiggyBank, Target, Settings, Moon, Sun, LogOut, ChevronLeft,
  Search, Shield,
} from 'lucide-react'
import { useTheme } from './theme-provider'
import { useState, useEffect } from 'react'
import { getHeaders } from '@/lib/api'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/register', label: 'Registro por Voz', icon: Mic },
  { href: '/chat', label: 'Chat Financiero', icon: MessageSquare },
  { href: '/search', label: 'Buscador', icon: Search },
  { href: '/loans', label: 'Préstamos', icon: HandCoins },
  { href: '/budgets', label: 'Presupuestos', icon: PiggyBank },
  { href: '/goals', label: 'Metas', icon: Target },
]

export function Sidebar() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [collapsed, setCollapsed] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    checkAdmin()
  }, [])

  async function checkAdmin() {
    try {
      const res = await fetch('/api/admin/check')
      if (res.ok) {
        const data = await res.json()
        setIsAdmin(data.admin)
      }
    } catch {}
  }

  return (
    <aside
      className={cn(
        'h-screen fixed left-0 top-0 z-40 flex flex-col border-r transition-all duration-300',
        'bg-background border-border',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      <div className="flex items-center gap-2 p-4 border-b border-border">
        {!collapsed && (
          <span className="font-bold text-lg whitespace-nowrap">💰 Finanzas</span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto p-1 rounded-md hover:bg-secondary transition-colors"
        >
          <ChevronLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
        </button>
      </div>

      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                'hover:bg-secondary text-muted-foreground hover:text-foreground',
                isActive && 'bg-primary/10 text-primary hover:bg-primary/15',
                collapsed && 'justify-center px-2'
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
            </Link>
          )
        })}

        {isAdmin && (
          <Link
            href="/admin/users"
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
              'hover:bg-secondary text-muted-foreground hover:text-foreground',
              pathname === '/admin/users' && 'bg-primary/10 text-primary',
              collapsed && 'justify-center px-2'
            )}
          >
            <Shield className="h-5 w-5 shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Admin</span>}
          </Link>
        )}
      </nav>

      <div className="p-2 border-t border-border space-y-1">
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className={cn(
            'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-all duration-200',
            'hover:bg-secondary text-muted-foreground hover:text-foreground',
            collapsed && 'justify-center px-2'
          )}
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          {!collapsed && <span className="text-sm">Modo {theme === 'dark' ? 'Claro' : 'Oscuro'}</span>}
        </button>
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-all duration-200',
            'hover:bg-secondary text-muted-foreground hover:text-foreground',
            collapsed && 'justify-center px-2'
          )}
        >
          <Settings className="h-5 w-5" />
          {!collapsed && <span className="text-sm">Configuración</span>}
        </Link>
        <LogoutButton collapsed={collapsed} />
      </div>
    </aside>
  )
}

function LogoutButton({ collapsed }: { collapsed: boolean }) {
  const [loading, setLoading] = useState(false)

  async function handleLogout() {
    setLoading(true)
    try {
      const { supabase } = await import('@/lib/supabase-browser')
      await supabase.auth.signOut()
      window.location.href = '/login'
    } catch {}
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className={cn(
        'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-all duration-200',
        'hover:bg-destructive/10 text-muted-foreground hover:text-destructive',
        collapsed && 'justify-center px-2'
      )}
    >
      <LogOut className="h-5 w-5 shrink-0" />
      {!collapsed && <span className="text-sm">{loading ? 'Saliendo...' : 'Cerrar sesión'}</span>}
    </button>
  )
}
