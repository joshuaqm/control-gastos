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