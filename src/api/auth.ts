export interface ApiUser {
  id: number
  username: string
  email: string
  accepted_terms?: boolean
  terms_version?: string | null
  accepted_at?: string | null
  ai_consent?: boolean
}

export interface AuthResponse {
  user: ApiUser
  token: string
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

const TOKEN_KEY = 'financeai.session'

export function getToken(): string | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY)
    return raw ? (JSON.parse(raw) as { token: string }).token : null
  } catch {
    return null
  }
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/login', { email, password })
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  return request<{ message: string }>('/auth/forgot-password', { email })
}

export async function resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
  return request<{ message: string }>('/auth/reset-password', { token, newPassword })
}

async function request<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new Error(data.error || 'Ocurrió un error, intenta de nuevo')
  }

  return data as T
}