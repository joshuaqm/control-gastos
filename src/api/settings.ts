import { getToken } from './auth'

export interface ApiSettings {
  username: string
  email: string
  currency: string
  notifications_enabled: boolean
  monthly_income: number | null
  is_active: boolean
  accepted_terms: boolean
  terms_version: string | null
  accepted_at: string | null
  ai_consent: boolean
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

export async function fetchSettings(): Promise<ApiSettings> {
  return request<ApiSettings>('/settings')
}

export async function updateSettings(
  body: Partial<Pick<ApiSettings, 'username' | 'email' | 'currency' | 'notifications_enabled' | 'monthly_income' | 'ai_consent'>>
): Promise<ApiSettings> {
  return request<ApiSettings>('/settings', { method: 'PUT', body })
}

export async function acceptTerms(terms_version: string): Promise<{ accepted_terms: boolean; terms_version: string; accepted_at: string }> {
  return request('/settings/accept-terms', { method: 'POST', body: { terms_version } })
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
  return request<{ message: string }>('/settings/password', {
    method: 'PUT',
    body: { currentPassword, newPassword },
  })
}