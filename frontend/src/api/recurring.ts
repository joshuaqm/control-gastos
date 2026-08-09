import { getToken } from './auth'

export interface ApiRecurring {
  id: number
  name: string
  amount: number
  frequency: string
  next_date: string
  category: string | null
  budget_type: string | null
  account_id: number | null
  is_active: boolean
  notes: string | null
  created_at: string
  updated_at: string
  userId: number
}

export interface CreateRecurringInput {
  name: string
  amount: number
  frequency: string
  next_date: string
  category?: string | null
  budget_type?: string | null
  account_id: number | null
  is_active?: boolean
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

export async function fetchRecurring(): Promise<ApiRecurring[]> {
  return request<ApiRecurring[]>('/recurring')
}

export async function createRecurring(body: CreateRecurringInput): Promise<ApiRecurring> {
  return request<ApiRecurring>('/recurring', { method: 'POST', body })
}

export async function updateRecurring(
  id: number,
  body: Partial<CreateRecurringInput>
): Promise<ApiRecurring> {
  return request<ApiRecurring>(`/recurring/${id}`, { method: 'PUT', body })
}

export async function deleteRecurring(id: number): Promise<void> {
  return request<void>(`/recurring/${id}`, { method: 'DELETE' })
}

export async function registerRecurringPayment(
  id: number,
  body: { account_id?: number | null; date?: string; description?: string }
): Promise<{ transaction: unknown; recurring: ApiRecurring }> {
  return request<{ transaction: unknown; recurring: ApiRecurring }>(`/recurring/${id}/register`, {
    method: 'POST',
    body,
  })
}