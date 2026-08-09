export interface ApiUser {
  id: number
  username: string
  email: string
}

export interface AuthResponse {
  user: ApiUser
  token: string
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

export async function login(email: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/login', { email, password })
}

export async function register(username: string, email: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/register', { username, email, password })
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