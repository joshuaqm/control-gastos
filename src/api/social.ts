import { getToken } from './auth'

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

export interface PublicUser {
  id: number
  username: string
}

export interface FriendshipView {
  friendship_id: number
  user: PublicUser
  created_at: string
  responded_at: string | null
}

export interface FriendsData {
  friends: FriendshipView[]
  incoming: FriendshipView[]
  outgoing: FriendshipView[]
}

export type SharedRole = 'owner' | 'admin' | 'member' | 'viewer'
export type SharedEntryType = 'contribution' | 'withdrawal' | 'expense' | 'transfer'
export type PeerLoanStatus = 'open' | 'settled' | 'cancelled'

export interface SharedMember {
  user_id: number
  role: SharedRole
  joined_at: string
  user: PublicUser
}

export interface SharedEntryApi {
  id: number
  shared_account_id: number
  user_id: number
  type: SharedEntryType
  amount: number
  date: string
  description: string | null
  category: string | null
  voided_at: string | null
  created_at: string
  updated_at: string
  user: PublicUser
}

export interface SharedAccountApi {
  id: number
  name: string
  kind: string
  currency: string
  owner_id: number
  status: string
  created_at: string
  updated_at: string
  role: SharedRole
  balance: number
  members: SharedMember[]
}

export interface PeerLoanPaymentApi {
  id: number
  peer_loan_id: number
  payer_id: number
  amount: number
  date: string
  method: string | null
  note: string | null
  voided_at: string | null
  user: PublicUser
}

export interface PeerLoanApi {
  id: number
  lender_id: number
  borrower_id: number
  original_amount: number
  paid_amount: number
  pending_amount: number
  currency: string
  description: string | null
  start_date: string
  due_date: string | null
  status: PeerLoanStatus
  created_at: string
  lender: PublicUser
  borrower: PublicUser
  payments: PeerLoanPaymentApi[]
}

export interface SharedGoalContributionApi {
  id: number
  shared_goal_id: number
  user_id: number
  amount: number
  date: string
  note: string | null
  voided_at: string | null
  user: PublicUser
}

export interface SharedGoalApi {
  id: number
  shared_account_id: number
  created_by: number
  name: string
  target_amount: number
  saved_amount: number
  progress: number
  target_date: string | null
  status: string
  created_at: string
  contributions: SharedGoalContributionApi[]
}

// ---- Friends ----
export const fetchFriends = () => request<FriendsData>('/friends')

export const searchUsers = (q: string) =>
  request<{ results: PublicUser[] }>(`/friends/search?q=${encodeURIComponent(q)}`)

export const sendFriendInvitation = (body: { username?: string; email?: string; user_id?: number }) =>
  request<FriendshipView>('/friends/invitations', { method: 'POST', body })

export const respondFriendInvitation = (id: number, action: 'accept' | 'reject') =>
  request<FriendshipView>(`/friends/${id}/${action}`, { method: 'PUT' })

export const blockFriend = (id: number) =>
  request<{ message: string }>(`/friends/${id}/block`, { method: 'PUT' })

export const removeFriend = (id: number) =>
  request<{ message: string }>(`/friends/${id}`, { method: 'DELETE' })

// ---- Shared accounts ----
export const fetchSharedAccounts = () =>
  request<{ accounts: SharedAccountApi[]; users: PublicUser[] }>('/shared-accounts')

export const createSharedAccount = (body: { name: string; kind?: string }) =>
  request<{ account: SharedAccountApi }>('/shared-accounts', { method: 'POST', body })

export const fetchSharedAccount = (id: number) =>
  request<{ account: SharedAccountApi; entries: SharedEntryApi[]; users: PublicUser[] }>(
    `/shared-accounts/${id}`
  )

export const updateSharedAccount = (id: number, body: { name?: string; kind?: string; status?: string }) =>
  request<{ account: SharedAccountApi }>(`/shared-accounts/${id}`, { method: 'PUT', body })

export const archiveSharedAccount = (id: number) =>
  request<{ message: string }>(`/shared-accounts/${id}`, { method: 'DELETE' })

export const addSharedMember = (id: number, body: { user_id: number; role?: SharedRole }) =>
  request<{ member: SharedMember }>(`/shared-accounts/${id}/members`, { method: 'POST', body })

export const updateSharedMember = (id: number, userId: number, role: SharedRole) =>
  request<{ member: SharedMember }>(`/shared-accounts/${id}/members/${userId}`, {
    method: 'PUT',
    body: { role },
  })

export const removeSharedMember = (id: number, userId: number) =>
  request<{ message: string }>(`/shared-accounts/${id}/members/${userId}`, { method: 'DELETE' })

export const createSharedEntry = (
  id: number,
  body: { type: SharedEntryType; amount: number; date?: string; description?: string; category?: string }
) => request<{ entry: SharedEntryApi }>(`/shared-accounts/${id}/entries`, { method: 'POST', body })

export const voidSharedEntry = (id: number, entryId: number) =>
  request<{ entry: SharedEntryApi }>(`/shared-accounts/${id}/entries/${entryId}/void`, {
    method: 'PUT',
  })

// ---- Peer loans ----
export const fetchPeerLoans = () =>
  request<{ loans: PeerLoanApi[]; users: PublicUser[] }>('/peer-loans')

export const createPeerLoan = (body: {
  borrower_id: number
  original_amount: number
  description?: string
  start_date?: string
  due_date?: string | null
}) => request<{ loan: PeerLoanApi }>('/peer-loans', { method: 'POST', body })

export const fetchPeerLoan = (id: number) => request<{ loan: PeerLoanApi }>(`/peer-loans/${id}`)

export const addPeerLoanPayment = (
  id: number,
  body: { amount: number; date?: string; method?: string; note?: string }
) => request<{ loan: PeerLoanApi }>(`/peer-loans/${id}/payments`, { method: 'POST', body })

export const voidPeerLoanPayment = (id: number, paymentId: number) =>
  request<{ loan: PeerLoanApi }>(`/peer-loans/${id}/payments/${paymentId}/void`, { method: 'PUT' })

export const settlePeerLoan = (id: number) =>
  request<{ loan: PeerLoanApi }>(`/peer-loans/${id}/settle`, { method: 'PUT' })

// ---- Shared goals ----
export const fetchSharedGoals = () =>
  request<{ goals: SharedGoalApi[]; users: PublicUser[] }>('/shared-goals')

export const createSharedGoal = (body: {
  shared_account_id: number
  name: string
  target_amount: number
  target_date?: string | null
}) => request<{ goal: SharedGoalApi }>('/shared-goals', { method: 'POST', body })

export const updateSharedGoal = (
  id: number,
  body: { name?: string; target_amount?: number; target_date?: string | null; status?: string }
) => request<{ goal: SharedGoalApi }>(`/shared-goals/${id}`, { method: 'PUT', body })

export const addSharedGoalContribution = (
  id: number,
  body: { amount: number; date?: string; note?: string }
) =>
  request<{ contribution: SharedGoalContributionApi }>(`/shared-goals/${id}/contributions`, {
    method: 'POST',
    body,
  })

export const voidSharedGoalContribution = (id: number, contributionId: number) =>
  request<{ contribution: SharedGoalContributionApi }>(
    `/shared-goals/${id}/contributions/${contributionId}/void`,
    { method: 'PUT' }
  )
