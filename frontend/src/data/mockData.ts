import {
  Banknote,
  Car,
  Coffee,
  CreditCard,
  Gamepad2,
  Heart,
  Home,
  Landmark,
  ShoppingBag,
  TrendingUp,
  Utensils,
  Zap,
} from 'lucide-react'
import type { Account, BudgetCategory, Debt, Investment, Receivable, SavingsGoal, SubBudget, Transaction } from '@/types'

export type PatrimonyPoint = { month: string; valor: number }
export type CashFlowPoint = { month: string; ingresos: number; gastos: number }
export type CategoryDatum = { name: string; value: number; color: string }

export const patrimonialData: PatrimonyPoint[] = [
  { month: 'Mar', valor: 42000 },
  { month: 'Abr', valor: 44500 },
  { month: 'May', valor: 41200 },
  { month: 'Jun', valor: 47800 },
  { month: 'Jul', valor: 51300 },
  { month: 'Ago', valor: 54720 },
]

export const cashFlowData: CashFlowPoint[] = [
  { month: 'Mar', ingresos: 5200, gastos: 3800 },
  { month: 'Abr', ingresos: 5200, gastos: 4200 },
  { month: 'May', ingresos: 5600, gastos: 3600 },
  { month: 'Jun', ingresos: 5200, gastos: 4800 },
  { month: 'Jul', ingresos: 6100, gastos: 3900 },
  { month: 'Ago', ingresos: 5200, gastos: 3420 },
]

export const categoryData: CategoryDatum[] = [
  { name: 'Vivienda', value: 1400, color: '#7C3AED' },
  { name: 'Comida', value: 680, color: '#06D6A0' },
  { name: 'Transporte', value: 320, color: '#F59E0B' },
  { name: 'Salud', value: 210, color: '#3B82F6' },
  { name: 'Entretenimiento', value: 340, color: '#EF4444' },
  { name: 'Otros', value: 470, color: '#8B5CF6' },
]

export const assetsData: CategoryDatum[] = [
  { name: 'BBVA', value: 12400, color: '#7C3AED' },
  { name: 'Nu', value: 5800, color: '#06D6A0' },
  { name: 'Efectivo', value: 1200, color: '#F59E0B' },
  { name: 'Inversiones', value: 22100, color: '#3B82F6' },
]

export const transactions: Transaction[] = [
  { id: 1, icon: Utensils, desc: 'Restaurante La Paloma', cat: 'Comida', account: 'BBVA', amount: -420, date: '9 Ago', type: 'expense' },
  { id: 2, icon: Landmark, desc: 'Nómina Agosto', cat: 'Ingreso', account: 'BBVA', amount: 5200, date: '5 Ago', type: 'income' },
  { id: 3, icon: ShoppingBag, desc: 'Amazon - Audífonos', cat: 'Compras', account: 'Nu', amount: -1280, date: '4 Ago', type: 'expense' },
  { id: 4, icon: Car, desc: 'Gasolina Shell', cat: 'Transporte', account: 'BBVA', amount: -680, date: '3 Ago', type: 'expense' },
  { id: 5, icon: Zap, desc: 'CFE Electricidad', cat: 'Servicios', account: 'BBVA', amount: -340, date: '2 Ago', type: 'expense' },
  { id: 6, icon: Coffee, desc: 'Starbucks', cat: 'Comida', account: 'Nu', amount: -96, date: '1 Ago', type: 'expense' },
  { id: 7, icon: TrendingUp, desc: 'Dividendos GBM', cat: 'Inversión', account: 'GBM', amount: 320, date: '31 Jul', type: 'income' },
  { id: 8, icon: Heart, desc: 'Farmacia', cat: 'Salud', account: 'BBVA', amount: -180, date: '30 Jul', type: 'expense' },
]

export const budgetCategories: BudgetCategory[] = [
  { name: 'Necesidades', icon: '🏠', budget: 2600, spent: 2100, color: '#3B82F6', pct: 50 },
  { name: 'Deseos', icon: '🎯', budget: 1560, spent: 1040, color: '#F59E0B', pct: 30 },
  { name: 'Ahorro', icon: '💰', budget: 1040, spent: 780, color: '#06D6A0', pct: 20 },
]

export const subBudgets: SubBudget[] = [
  { name: 'Vivienda', icon: Home, budgeted: 1400, spent: 1400, color: '#7C3AED' },
  { name: 'Comida', icon: Utensils, budgeted: 800, spent: 680, color: '#06D6A0' },
  { name: 'Transporte', icon: Car, budgeted: 400, spent: 320, color: '#F59E0B' },
  { name: 'Salud', icon: Heart, budgeted: 300, spent: 210, color: '#EF4444' },
  { name: 'Entretenimiento', icon: Gamepad2, budgeted: 600, spent: 340, color: '#8B5CF6' },
]

export const debts: Debt[] = [
  { id: 1, name: 'Tarjeta Nu', creditor: 'Nu Bank', original: 12000, pending: 8400, color: '#06D6A0', dueDate: '15 Sep' },
  { id: 2, name: 'Auto Nissan', creditor: 'BBVA Auto', original: 180000, pending: 124000, color: '#7C3AED', dueDate: '1 Oct' },
  { id: 3, name: 'Juan López', creditor: 'Personal', original: 3000, pending: 1500, color: '#F59E0B', dueDate: '20 Ago' },
]

export const receivables: Receivable[] = [
  { id: 1, name: 'Carlos Mendez', amount: 500, status: 'Pendiente', date: '15 Sep' },
  { id: 2, name: 'Ana García', amount: 1200, status: 'Parcial', date: '30 Ago' },
]

export const investments: Investment[] = [
  { id: 1, ticker: 'AMZN', name: 'Amazon', qty: 5, price: 4820, prevPrice: 4600, color: '#F59E0B' },
  { id: 2, ticker: 'AAPL', name: 'Apple Inc.', qty: 12, price: 3240, prevPrice: 3100, color: '#06D6A0' },
  { id: 3, ticker: 'CETES', name: 'CETES 28d', qty: 1, price: 10000, prevPrice: 9950, color: '#3B82F6' },
  { id: 4, ticker: 'GBM+', name: 'GBM Smart Cash', qty: 1, price: 4200, prevPrice: 4180, color: '#7C3AED' },
]

export const savingsGoals: SavingsGoal[] = [
  { name: 'Fondo de Emergencia', current: 12000, goal: 30000, color: '#7C3AED' },
  { name: 'Vacaciones Europa', current: 8400, goal: 18000, color: '#06D6A0' },
  { name: 'MacBook Pro', current: 3200, goal: 4200, color: '#F59E0B' },
]

export const accounts: Account[] = [
  { id: 1, name: 'BBVA Débito', type: 'Débito', balance: 12400, prev: 11200, icon: Landmark, color: '#3B82F6' },
  { id: 2, name: 'Nu Cash', type: 'Débito', balance: 5800, prev: 6200, icon: CreditCard, color: '#8B5CF6' },
  { id: 3, name: 'Efectivo', type: 'Efectivo', balance: 1200, prev: 1500, icon: Banknote, color: '#F59E0B' },
  { id: 4, name: 'Nu Crédito', type: 'Crédito', balance: -8400, limit: 15000, dueDate: '15 Sep', icon: CreditCard, color: '#EF4444' },
  { id: 5, name: 'GBM Portafolio', type: 'Inversión', balance: 22100, prev: 21400, icon: TrendingUp, color: '#06D6A0' },
]