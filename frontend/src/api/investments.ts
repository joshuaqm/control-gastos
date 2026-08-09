import { getToken } from './auth'

export interface ApiInvestment {
  id: number
  name: string
  ticker: string | null
  broker: string | null
  type: string
  units: number
  average_cost: number
  current_price: number | null
  purchase_date: string | null
  last_updated: string | null
  notes: string | null
  created_at: string
  updated_at: string
  userId: number
}

export interface CreateInvestmentInput {
  name: string
  ticker?: string | null
  broker?: string | null
  type: string
  units: number
  average_cost: number
  current_price?: number | null
  purchase_date?: string | null
  last_updated?: string | null
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

export async function fetchInvestments(): Promise<ApiInvestment[]> {
  return request<ApiInvestment[]>('/investments')
}

export async function createInvestment(body: CreateInvestmentInput): Promise<ApiInvestment> {
  return request<ApiInvestment>('/investments', { method: 'POST', body })
}

export async function updateInvestment(
  id: number,
  body: Partial<CreateInvestmentInput>
): Promise<ApiInvestment> {
  return request<ApiInvestment>(`/investments/${id}`, { method: 'PUT', body })
}

export async function deleteInvestment(id: number): Promise<void> {
  return request<void>(`/investments/${id}`, { method: 'DELETE' })
}

export async function refreshInvestment(id: number): Promise<ApiInvestment> {
  return request<ApiInvestment>(`/investments/${id}/refresh`, { method: 'POST' })
}

export interface RefreshAllResult {
  id: number
  name: string
  ticker: string | null
  success: boolean
  price?: number
  error?: string
}

export interface RefreshAllResponse {
  results: RefreshAllResult[]
  successCount: number
  total: number
}

export async function refreshAllInvestments(): Promise<RefreshAllResponse> {
  return request<RefreshAllResponse>('/investments/refresh-all', { method: 'POST' })
}