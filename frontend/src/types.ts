import type { LucideIcon } from 'lucide-react'

export type ToastKind = 'success' | 'error' | 'info'

export type Toast = {
  id: number
  msg: string
  kind: ToastKind
}

export type Transaction = {
  id: number
  icon: LucideIcon
  desc: string
  cat: string
  account: string
  amount: number
  date: string
  type: 'expense' | 'income'
}

export type BudgetCategory = {
  name: string
  icon: string
  budget: number
  spent: number
  color: string
  pct: number
}

export type SubBudget = {
  name: string
  icon: LucideIcon
  budgeted: number
  spent: number
  color: string
}

export type Debt = {
  id: number
  name: string
  creditor: string
  original: number
  pending: number
  color: string
  dueDate: string
}

export type Receivable = {
  id: number
  name: string
  amount: number
  status: string
  date: string
}

export type Investment = {
  id: number
  ticker: string
  name: string
  qty: number
  price: number
  prevPrice: number
  color: string
}

export type SavingsGoal = {
  name: string
  current: number
  goal: number
  color: string
}

export type Account = {
  id: number
  name: string
  type: string
  balance: number
  prev?: number
  limit?: number
  dueDate?: string
  icon: LucideIcon
  color: string
}

export type ChatCard = {
  type: string
  data: Record<string, string | number>
}

export type ChatMsg = {
  id: number
  from: 'user' | 'ai'
  text: string
  card?: ChatCard
}

export type ShowToast = (msg: string, kind: ToastKind) => void
