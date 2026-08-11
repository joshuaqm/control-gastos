import { getToken } from './auth'

export interface ApiDebt {
  id: number
  name: string
  creditor: string
  type: string
  original_amount: number
  paid_amount: number
  interest_rate: number | null
  account_id: number | null
  start_date: string
  due_date: string | null
  status: string
  notes: string | null
  created_at: string
  updated_at: string
  userId: number
}

export interface CreateDebtInput {
  name: string
  creditor: string
  type: string
  original_amount: number
  interest_rate?: number | null
  account_id?: number | null
  start_date: string
  due_date?: string | null
  status?: string
  notes?: string | null
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

export async function fetchDebts(): Promise<ApiDebt[]> {
  return request<ApiDebt[]>('/debts')
}

export async function createDebt(body: CreateDebtInput): Promise<ApiDebt> {
  return request<ApiDebt>('/debts', { method: 'POST', body })
}

export async function updateDebt(id: number, body: Partial<CreateDebtInput>): Promise<ApiDebt> {
  return request<ApiDebt>(`/debts/${id}`, { method: 'PUT', body })
}

export async function deleteDebt(id: number): Promise<void> {
  return request<void>(`/debts/${id}`, { method: 'DELETE' })
}

export interface PayDebtInput {
  amount: number
  account_id?: number | null
  date: string
  description?: string
}

export async function payDebt(id: number, body: PayDebtInput): Promise<{ debt: ApiDebt; transaction: unknown }> {
  return request<{ debt: ApiDebt; transaction: unknown }>(`/debts/${id}/pay`, { method: 'POST', body })
}