import { getToken } from './auth'

export interface BudgetRuleRow {
  id: number | null
  exists: boolean
  budgetType: string
  name: string
  icon: string
  color: string
  percentage: number
  target: number
  spent: number
  remaining: number
}

export interface BudgetCategoryItem {
  category: string
  spent: number
  share: number
}

export interface BudgetCategoryGroup {
  budgetType: string | null
  name: string
  icon: string
  color: string
  total: number
  share: number
  items: BudgetCategoryItem[]
}

export interface BudgetSummary {
  month: string
  monthLabel: string
  theoreticalIncome: number
  realIncome: number
  totalSpent: number
  rule: BudgetRuleRow[]
  categories: BudgetCategoryGroup[]
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

async function request<T>(
  path: string,
  options?: { method?: string; body?: unknown }
): Promise<T> {
  const { method = 'GET', body } = options ?? {}
  const token = getToken()
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
  if (method !== 'GET') headers['Content-Type'] = 'application/json'

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (res.status === 204) return undefined as T

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || 'Ocurrió un error, intenta de nuevo')
  }
  return data as T
}

export async function fetchBudgetSummary(): Promise<BudgetSummary> {
  return request<BudgetSummary>('/budgets/summary')
}

export async function createBudget(body: {
  category?: string
  budget_type?: string | null
  percentage: number
}): Promise<unknown> {
  return request('/budgets', { method: 'POST', body })
}

export async function updateBudget(
  id: number,
  body: { percentage?: number; budget_type?: string | null }
): Promise<unknown> {
  return request(`/budgets/${id}`, { method: 'PUT', body })
}

export async function updateBudgetSettings(
  theoreticalIncome: number
): Promise<{ theoreticalIncome: number }> {
  return request('/budgets/settings', { method: 'PUT', body: { theoreticalIncome } })
}