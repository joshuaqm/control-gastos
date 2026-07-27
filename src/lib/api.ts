import { supabase } from './supabase-browser'

let cachedToken: string | null = null

export async function getHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
    cachedToken = token
  } else if (cachedToken) {
    headers['Authorization'] = `Bearer ${cachedToken}`
  }
  return headers
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
    cachedToken = token
  } else if (cachedToken) {
    headers['Authorization'] = `Bearer ${cachedToken}`
  }
  return headers
}

export async function apiFetch<T = any>(url: string, options?: RequestInit): Promise<T> {
  const headers = await getAuthHeaders()
  const response = await fetch(url, {
    ...options,
    headers: { ...headers, ...options?.headers },
  })

  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
    throw new Error('Sesión expirada')
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Error de red' }))
    throw new Error(error.error || `Error ${response.status}`)
  }

  return response.json()
}

export async function apiPost<T = any>(url: string, body?: any): Promise<T> {
  return apiFetch<T>(url, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  })
}
