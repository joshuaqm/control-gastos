import { BarChart2, Bot, CreditCard, DollarSign, Home, PiggyBank, Repeat, Settings, Target, TrendingUp, type LucideIcon } from 'lucide-react'

export type ScreenId =
  | 'dashboard'
  | 'accounts'
  | 'transactions'
  | 'budgets'
  | 'goals'
  | 'debts'
  | 'recurring'
  | 'investments'
  | 'settings'
  | 'assistant'

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
  { id: 'goals', label: 'Metas de Ahorro', icon: PiggyBank },
  { id: 'debts', label: 'Deudas', icon: DollarSign },
  { id: 'recurring', label: 'Recurrentes', icon: Repeat },
  { id: 'assistant', label: 'Asistente IA', icon: Bot },
  { id: 'investments', label: 'Inversiones', icon: TrendingUp },
  { id: 'settings', label: 'Configuración', icon: Settings },
]