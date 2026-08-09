import { getToken } from './auth'

export interface ApiReceivable {
  id: number
  person: string
  description: string | null
  original_amount: number
  collected_amount: number
  due_date: string | null
  status: string
  notes: string | null
  created_at: string
  updated_at: string
  userId: number
}

export interface CreateReceivableInput {
  person: string
  description?: string | null
  original_amount: number
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

export async function fetchReceivables(): Promise<ApiReceivable[]> {
  return request<ApiReceivable[]>('/receivables')
}

export async function createReceivable(body: CreateReceivableInput): Promise<ApiReceivable> {
  return request<ApiReceivable>('/receivables', { method: 'POST', body })
}

export async function updateReceivable(
  id: number,
  body: Partial<CreateReceivableInput>
): Promise<ApiReceivable> {
  return request<ApiReceivable>(`/receivables/${id}`, { method: 'PUT', body })
}

export async function deleteReceivable(id: number): Promise<void> {
  return request<void>(`/receivables/${id}`, { method: 'DELETE' })
}

export interface CollectReceivableInput {
  amount: number
  account_id?: number | null
  date: string
}

export async function collectReceivable(
  id: number,
  body: CollectReceivableInput
): Promise<{ receivable: ApiReceivable; transaction: unknown }> {
  return request<{ receivable: ApiReceivable; transaction: unknown }>(`/receivables/${id}/collect`, {
    method: 'POST',
    body,
  })
}