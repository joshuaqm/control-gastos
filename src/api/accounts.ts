import { getToken } from './auth'

export interface ApiAccount {
  id: number
  name: string
  type: 'debit' | 'credit' | 'cash' | 'savings' | 'investment'
  balance: number
  initial_balance: number
  credit_limit: number | null
  interest_rate: number | null
  last_interest_at: string | null
  cutoff_day: number | null
  payment_due_day: number | null
  is_active: boolean
  created_at: string
  updated_at: string
  userId: number
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

export async function fetchAccounts(): Promise<ApiAccount[]> {
  return request<ApiAccount[]>('/accounts')
}

export async function createAccount(
  account: Partial<ApiAccount>
): Promise<ApiAccount> {
  return request<ApiAccount>('/accounts', {
    method: 'POST',
    body: account,
  })
}

export async function updateAccount(
  id: number,
  account: Partial<ApiAccount>
): Promise<ApiAccount> {
  return request<ApiAccount>(`/accounts/${id}`, {
    method: 'PUT',
    body: account,
  })
}

export async function deleteAccount(id: number): Promise<void> {
  return request<void>(`/accounts/${id}`, { method: 'DELETE' })
}

export interface AdjustInterestResult {
  theoreticalRemoved: number
  balanceDelta: number
  account: ApiAccount
  transaction: { id: number; amount: number; date: string; notes: string }
}

export async function adjustAccountInterest(
  id: number,
  amount: number,
  month?: string
): Promise<AdjustInterestResult> {
  return request<AdjustInterestResult>(`/accounts/${id}/adjust-interest`, {
    method: 'POST',
    body: { amount, month },
  })
}

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