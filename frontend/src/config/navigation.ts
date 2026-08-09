import { BarChart2, CreditCard, DollarSign, Home, Settings, Target, TrendingUp, type LucideIcon } from 'lucide-react'

export type ScreenId =
  | 'dashboard'
  | 'accounts'
  | 'transactions'
  | 'budgets'
  | 'debts'
  | 'investments'
  | 'settings'

export type NavItem = {
  id: ScreenId
  label: string
  icon: LucideIcon
}

export const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'accounts', label: 'Cuentas', icon: CreditCard },
  { id: 'transactions', label: 'Transacciones', icon: BarChart2 },
  { id: 'budgets', label: 'Presupuestos', icon: Target },
  { id: 'debts', label: 'Deudas', icon: DollarSign },
  { id: 'investments', label: 'Inversiones', icon: TrendingUp },
  { id: 'settings', label: 'Configuración', icon: Settings },
]