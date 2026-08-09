import { getToken } from './auth'

export interface ApiTransaction {
  id: number
  date: string
  description: string
  amount: number
  type: string
  category: string | null
  budget_type: string | null
  account_id: number | null
  destination_account_id: number | null
  userId: number
  [key: string]: unknown
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

export interface CreateTransactionInput {
  date: string
  description: string
  amount: number
  type: string
  category?: string | null
  budget_type?: string | null
  account_id?: number | null
  destination_account_id?: number | null
  debt_id?: number | null
  receivable_id?: number | null
  notes?: string | null
}

export async function createTransaction(body: CreateTransactionInput): Promise<ApiTransaction> {
  return request<ApiTransaction>('/transactions', { method: 'POST', body })
}

export async function updateTransaction(
  id: number,
  body: CreateTransactionInput
): Promise<ApiTransaction> {
  return request<ApiTransaction>(`/transactions/${id}`, { method: 'PUT', body })
}

export async function deleteTransaction(id: number): Promise<void> {
  return request<void>(`/transactions/${id}`, { method: 'DELETE' })
}

export async function fetchTransactions(): Promise<ApiTransaction[]> {
  const token = getToken()
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
  const res = await fetch(`${API_URL}/transactions`, { headers })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Error al cargar transacciones')
  }
  return res.json() as Promise<ApiTransaction[]>
}