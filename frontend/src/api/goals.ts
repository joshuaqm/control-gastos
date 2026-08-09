import { getToken } from './auth'

export interface ApiGoal {
  id: number
  name: string
  target_amount: number
  current_amount: number
  target_date: string | null
  priority: number
  account_id: number | null
  notes: string | null
  created_at: string
  updated_at: string
  userId: number
}

export interface CreateGoalInput {
  name: string
  target_amount: number
  current_amount?: number
  target_date?: string | null
  priority?: number
  account_id?: number | null
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

export async function fetchGoals(): Promise<ApiGoal[]> {
  return request<ApiGoal[]>('/goals')
}

export async function createGoal(body: CreateGoalInput): Promise<ApiGoal> {
  return request<ApiGoal>('/goals', { method: 'POST', body })
}

export async function updateGoal(
  id: number,
  body: Partial<CreateGoalInput>
): Promise<ApiGoal> {
  return request<ApiGoal>(`/goals/${id}`, { method: 'PUT', body })
}

export async function deleteGoal(id: number): Promise<void> {
  return request<void>(`/goals/${id}`, { method: 'DELETE' })
}

export async function depositGoal(
  id: number,
  body: { amount: number; account_id: number | null; date?: string }
): Promise<ApiGoal> {
  return request<ApiGoal>(`/goals/${id}/deposit`, { method: 'POST', body })
}