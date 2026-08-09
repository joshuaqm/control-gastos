import { getToken } from './auth'

export interface ApiInstallment {
  id: number
  account_id: number | null
  description: string
  monthly_amount: number
  months_total: number
  months_paid: number
  status: string
  notes: string | null
  created_at: string
  updated_at: string
  userId: number
}

export interface CreateInstallmentInput {
  account_id?: number | null
  description: string
  monthly_amount: number
  months_total: number
  months_paid?: number
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

export async function fetchInstallments(): Promise<ApiInstallment[]> {
  return request<ApiInstallment[]>('/installments')
}

export async function createInstallment(body: CreateInstallmentInput): Promise<ApiInstallment> {
  return request<ApiInstallment>('/installments', { method: 'POST', body })
}

export async function updateInstallment(
  id: number,
  body: Partial<CreateInstallmentInput>
): Promise<ApiInstallment> {
  return request<ApiInstallment>(`/installments/${id}`, { method: 'PUT', body })
}

export async function deleteInstallment(id: number): Promise<void> {
  return request<void>(`/installments/${id}`, { method: 'DELETE' })
}

export async function payInstallmentMonth(id: number): Promise<ApiInstallment> {
  return request<ApiInstallment>(`/installments/${id}/pay-month`, { method: 'POST' })
}