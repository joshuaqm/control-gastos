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
  disabled?: boolean
}

export const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'budgets', label: 'Presupuestos', icon: Target },
  { id: 'accounts', label: 'Cuentas', icon: CreditCard },
  { id: 'transactions', label: 'Transacciones', icon: BarChart2 },
  { id: 'goals', label: 'Metas de Ahorro', icon: PiggyBank },
  { id: 'debts', label: 'Deudas', icon: DollarSign },
  { id: 'recurring', label: 'Recurrentes', icon: Repeat },
  { id: 'investments', label: 'Inversiones', icon: TrendingUp },
  { id: 'assistant', label: 'Asistente IA', icon: Bot, disabled: true }, // Deshabilitado por ahora
  { id: 'settings', label: 'Configuración', icon: Settings, disabled: true }, // Deshabilitado por ahora
]