import { useEffect, useState } from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Ban,
  Check,
  ChevronLeft,
  HandCoins,
  Plus,
  Target,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react'
import {
  addPeerLoanPayment,
  addSharedGoalContribution,
  addSharedMember,
  archiveSharedAccount,
  blockFriend,
  createPeerLoan,
  createSharedAccount,
  createSharedEntry,
  createSharedGoal,
  fetchFriends,
  fetchPeerLoans,
  fetchSharedAccount,
  fetchSharedAccounts,
  fetchSharedGoals,
  removeFriend,
  removeSharedMember,
  respondFriendInvitation,
  searchUsers,
  sendFriendInvitation,
  settlePeerLoan,
  voidPeerLoanPayment,
  voidSharedEntry,
  voidSharedGoalContribution,
  type FriendsData,
  type PeerLoanApi,
  type PublicUser,
  type SharedAccountApi,
  type SharedEntryApi,
  type SharedEntryType,
  type SharedGoalApi,
  type SharedRole,
} from '@/api/social'
import type { ApiUser } from '@/api/auth'
import { fmt } from '@/utils/format'
import type { ShowToast } from '@/types'

type Tab = 'friends' | 'accounts' | 'loans' | 'goals'

const inputStyle = { background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-1)' }
const selectStyle = { background: 'var(--input-bg-select)', border: '1px solid var(--input-border)', color: 'var(--text-1)' }
const cardBorder = { border: '1px solid var(--glass-border)' }

const today = () => new Date().toISOString().slice(0, 10)

const shortDate = (d: string | null) => {
  if (!d) return '—'
  const dt = new Date(`${String(d).slice(0, 10)}T00:00:00`)
  if (Number.isNaN(dt.getTime())) return '—'
  return dt.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

const ENTRY_LABEL: Record<SharedEntryType, string> = {
  contribution: 'Aportación',
  withdrawal: 'Retiro',
  expense: 'Gasto',
  transfer: 'Transferencia',
}

const ROLE_LABEL: Record<SharedRole, string> = {
  owner: 'Propietario',
  admin: 'Administrador',
  member: 'Miembro',
  viewer: 'Solo lectura',
}

function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'var(--modal-backdrop)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="glass animate-slide-up rounded-2xl p-6 w-full max-w-md max-h-[85vh] overflow-y-auto"
        style={{ border: '1px solid rgba(124,58,237,0.2)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} style={{ color: 'var(--text-3)' }} aria-label="Cerrar">
            <span className="text-xl leading-none">×</span>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <div className="py-16 flex justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-purple-600 animate-spin" />
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div className="py-16 text-center text-sm rounded-2xl" style={{ background: 'var(--card)', color: 'var(--text-3)' }}>
      {text}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Friends
// ---------------------------------------------------------------------------

function FriendsTab({
  data,
  reload,
  showToast,
}: {
  data: FriendsData
  reload: () => Promise<void>
  showToast: ShowToast
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PublicUser[]>([])
  const [searching, setSearching] = useState(false)
  const [busy, setBusy] = useState<number | null>(null)

  const runSearch = async () => {
    if (query.trim().length < 2) return
    setSearching(true)
    try {
      const res = await searchUsers(query.trim())
      setResults(res.results)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al buscar', 'error')
    } finally {
      setSearching(false)
    }
  }

  const invite = async (user: PublicUser) => {
    try {
      await sendFriendInvitation({ user_id: user.id })
      showToast(`Invitación enviada a ${user.username}`, 'success')
      setResults([])
      setQuery('')
      await reload()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al invitar', 'error')
    }
  }

  const respond = async (id: number, action: 'accept' | 'reject') => {
    setBusy(id)
    try {
      await respondFriendInvitation(id, action)
      showToast(action === 'accept' ? 'Invitación aceptada' : 'Invitación rechazada', 'success')
      await reload()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al responder', 'error')
    } finally {
      setBusy(null)
    }
  }

  const remove = async (id: number, username: string) => {
    if (!window.confirm(`¿Eliminar a ${username} de tus amigos?`)) return
    try {
      await removeFriend(id)
      showToast('Amigo eliminado', 'success')
      await reload()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al eliminar', 'error')
    }
  }

  const block = async (id: number) => {
    try {
      await blockFriend(id)
      showToast('Usuario bloqueado', 'success')
      await reload()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al bloquear', 'error')
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="glass rounded-2xl p-5" style={cardBorder}>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><UserPlus size={16} /> Agregar amigo</h3>
        <div className="flex gap-2">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') runSearch() }}
            placeholder="Busca por usuario o correo"
            className="flex-1 px-4 py-3 rounded-xl text-sm"
            style={inputStyle}
          />
          <button onClick={runSearch} disabled={searching} className="btn-primary px-4 py-3 rounded-xl text-sm font-semibold">
            {searching ? '…' : 'Buscar'}
          </button>
        </div>
        {results.length > 0 && (
          <div className="mt-3 flex flex-col gap-2">
            {results.map(u => (
              <div key={u.id} className="flex items-center justify-between px-3 py-2 rounded-xl" style={{ background: 'var(--card-subtle)' }}>
                <span className="text-sm">{u.username}</span>
                <button onClick={() => invite(u)} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'rgba(124,58,237,0.18)', color: '#A78BFA' }}>
                  Invitar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {data.incoming.length > 0 && (
        <div className="glass rounded-2xl p-5" style={cardBorder}>
          <h3 className="text-sm font-semibold mb-3">Solicitudes recibidas</h3>
          <div className="flex flex-col gap-2">
            {data.incoming.map(f => (
              <div key={f.friendship_id} className="flex items-center justify-between px-3 py-2 rounded-xl" style={{ background: 'var(--card-subtle)' }}>
                <span className="text-sm">{f.user.username}</span>
                <div className="flex gap-2">
                  <button onClick={() => respond(f.friendship_id, 'accept')} disabled={busy === f.friendship_id} className="p-2 rounded-lg" style={{ background: 'rgba(6,214,160,0.15)', color: '#06D6A0' }} aria-label="Aceptar">
                    <Check size={15} />
                  </button>
                  <button onClick={() => respond(f.friendship_id, 'reject')} disabled={busy === f.friendship_id} className="p-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.15)', color: '#F87171' }} aria-label="Rechazar">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.outgoing.length > 0 && (
        <div className="glass rounded-2xl p-5" style={cardBorder}>
          <h3 className="text-sm font-semibold mb-3">Solicitudes enviadas</h3>
          <div className="flex flex-col gap-2">
            {data.outgoing.map(f => (
              <div key={f.friendship_id} className="flex items-center justify-between px-3 py-2 rounded-xl" style={{ background: 'var(--card-subtle)' }}>
                <span className="text-sm">{f.user.username}</span>
                <span className="text-xs" style={{ color: 'var(--text-3)' }}>Pendiente</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="glass rounded-2xl p-5" style={cardBorder}>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Users size={16} /> Amigos ({data.friends.length})</h3>
        {data.friends.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>Aún no tienes amigos agregados.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {data.friends.map(f => (
              <div key={f.friendship_id} className="flex items-center justify-between px-3 py-2 rounded-xl" style={{ background: 'var(--card-subtle)' }}>
                <span className="text-sm">{f.user.username}</span>
                <div className="flex gap-1">
                  <button onClick={() => block(f.friendship_id)} className="p-2 rounded-lg hover:bg-white/10" style={{ color: 'var(--text-3)' }} aria-label="Bloquear">
                    <Ban size={15} />
                  </button>
                  <button onClick={() => remove(f.friendship_id, f.user.username)} className="p-2 rounded-lg hover:bg-white/10" style={{ color: '#F87171' }} aria-label="Eliminar">
                    <UserMinus size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared accounts
// ---------------------------------------------------------------------------

function AccountsTab({
  accounts,
  friends,
  reload,
  showToast,
  myId,
}: {
  accounts: SharedAccountApi[]
  friends: PublicUser[]
  reload: () => Promise<void>
  showToast: ShowToast
  myId: number
}) {
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detail, setDetail] = useState<{ account: SharedAccountApi; entries: SharedEntryApi[] } | null>(null)
  const [memberOpen, setMemberOpen] = useState(false)
  const [entryOpen, setEntryOpen] = useState(false)

  const loadDetail = async (id: number) => {
    try {
      const res = await fetchSharedAccount(id)
      setDetail({ account: res.account, entries: res.entries })
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al cargar la cuenta', 'error')
    }
  }

  useEffect(() => { if (selectedId != null) loadDetail(selectedId) }, [selectedId])

  const handleCreate = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await createSharedAccount({ name: name.trim() })
      showToast('Cuenta compartida creada', 'success')
      setCreateOpen(false)
      setName('')
      await reload()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al crear', 'error')
    } finally {
      setSaving(false)
    }
  }

  const archive = async (account: SharedAccountApi) => {
    if (!window.confirm(`¿Archivar la cuenta "${account.name}"?`)) return
    try {
      await archiveSharedAccount(account.id)
      showToast('Cuenta archivada', 'success')
      setSelectedId(null)
      setDetail(null)
      await reload()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al archivar', 'error')
    }
  }

  const removeMember = async (userId: number) => {
    if (!selectedId) return
    try {
      await removeSharedMember(selectedId, userId)
      showToast('Miembro eliminado', 'success')
      await loadDetail(selectedId)
      await reload()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al eliminar miembro', 'error')
    }
  }

  const voidEntry = async (entryId: number) => {
    if (!selectedId) return
    try {
      await voidSharedEntry(selectedId, entryId)
      showToast('Movimiento anulado', 'success')
      await loadDetail(selectedId)
      await reload()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al anular', 'error')
    }
  }

  if (selectedId != null && detail) {
    const { account, entries } = detail
    const canManage = account.role === 'owner' || account.role === 'admin'
    const canWrite = account.role !== 'viewer'
    const memberIds = new Set(account.members.map(m => m.user_id))
    const addableFriends = friends.filter(f => !memberIds.has(f.id))
    return (
      <div className="flex flex-col gap-5">
        <button onClick={() => { setSelectedId(null); setDetail(null) }} className="flex items-center gap-1 text-sm self-start" style={{ color: 'var(--text-2)' }}>
          <ChevronLeft size={16} /> Volver
        </button>

        <div className="glass rounded-2xl p-5" style={cardBorder}>
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-bold">{account.name}</h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{ROLE_LABEL[account.role]} · {account.members.length} miembros</p>
            </div>
            <div className="text-right">
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>Saldo</p>
              <p className="text-xl font-bold font-mono" style={{ color: '#A78BFA' }}>{fmt(account.balance)}</p>
            </div>
          </div>
          {canManage && (
            <button onClick={() => archive(account)} className="mt-3 text-xs" style={{ color: '#F87171' }}>Archivar cuenta</button>
          )}
        </div>

        <div className="glass rounded-2xl p-5" style={cardBorder}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Miembros</h3>
            {canManage && (
              <button onClick={() => setMemberOpen(true)} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg" style={{ background: 'rgba(124,58,237,0.18)', color: '#A78BFA' }}>
                <UserPlus size={13} /> Agregar
              </button>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {account.members.map(m => (
              <div key={m.user_id} className="flex items-center justify-between px-3 py-2 rounded-xl" style={{ background: 'var(--card-subtle)' }}>
                <span className="text-sm">{m.user.username}{m.user_id === myId ? ' (tú)' : ''}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: 'var(--text-3)' }}>{ROLE_LABEL[m.role]}</span>
                  {canManage && m.role !== 'owner' && (
                    <button onClick={() => removeMember(m.user_id)} className="p-1.5 rounded-lg hover:bg-white/10" style={{ color: '#F87171' }} aria-label="Quitar miembro">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-2xl p-5" style={cardBorder}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Movimientos</h3>
            {canWrite && (
              <button onClick={() => setEntryOpen(true)} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg" style={{ background: 'rgba(124,58,237,0.18)', color: '#A78BFA' }}>
                <Plus size={13} /> Registrar
              </button>
            )}
          </div>
          {entries.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-3)' }}>Sin movimientos aún.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {entries.map(e => {
                const outgoing = e.type !== 'contribution'
                return (
                  <div key={e.id} className="flex items-center justify-between px-3 py-2 rounded-xl" style={{ background: 'var(--card-subtle)', opacity: e.voided_at ? 0.5 : 1 }}>
                    <div className="flex items-center gap-2">
                      {outgoing ? <ArrowUpRight size={15} color="#F87171" /> : <ArrowDownLeft size={15} color="#06D6A0" />}
                      <div>
                        <p className="text-sm">{ENTRY_LABEL[e.type]}{e.description ? ` · ${e.description}` : ''}</p>
                        <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>{e.user.username} · {shortDate(e.date)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono" style={{ color: outgoing ? '#F87171' : '#06D6A0' }}>
                        {outgoing ? '-' : '+'}{fmt(e.amount)}
                      </span>
                      {!e.voided_at && (e.user_id === myId || canManage) && (
                        <button onClick={() => voidEntry(e.id)} className="p-1.5 rounded-lg hover:bg-white/10" style={{ color: '#F87171' }} aria-label="Anular">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <MemberModal
          open={memberOpen}
          friends={addableFriends}
          onClose={() => setMemberOpen(false)}
          onSave={async (userId, role) => {
            await addSharedMember(account.id, { user_id: userId, role })
            showToast('Miembro agregado', 'success')
            setMemberOpen(false)
            await loadDetail(account.id)
            await reload()
          }}
          showToast={showToast}
        />
        <EntryModal
          open={entryOpen}
          onClose={() => setEntryOpen(false)}
          onSave={async body => {
            await createSharedEntry(account.id, body)
            showToast('Movimiento registrado', 'success')
            setEntryOpen(false)
            await loadDetail(account.id)
            await reload()
          }}
          showToast={showToast}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Cuentas compartidas ({accounts.length})</h3>
        <button onClick={() => setCreateOpen(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold btn-primary">
          <Plus size={15} /> Nueva
        </button>
      </div>

      {accounts.length === 0 ? (
        <Empty text="Crea una cuenta compartida para empezar a ahorrar en grupo." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {accounts.map(account => (
            <button key={account.id} onClick={() => setSelectedId(account.id)} className="glass card-hover rounded-2xl p-5 text-left flex flex-col gap-2" style={cardBorder}>
              <div className="flex items-center justify-between">
                <span className="font-semibold">{account.name}</span>
                <Wallet size={16} color="#A78BFA" />
              </div>
              <span className="text-2xl font-bold font-mono" style={{ color: '#A78BFA' }}>{fmt(account.balance)}</span>
              <span className="text-xs" style={{ color: 'var(--text-3)' }}>{ROLE_LABEL[account.role]} · {account.members.length} miembros</span>
            </button>
          ))}
        </div>
      )}

      <Modal open={createOpen} title="Nueva cuenta compartida" onClose={() => setCreateOpen(false)}>
        <div className="flex flex-col gap-3">
          <label className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>Nombre</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Fondo vacaciones" className="w-full px-4 py-3 rounded-xl text-sm" style={inputStyle} />
          <button onClick={handleCreate} disabled={saving} className="btn-primary w-full py-3 rounded-xl text-sm font-semibold mt-1">
            {saving ? 'Guardando…' : 'Crear'}
          </button>
        </div>
      </Modal>
    </div>
  )
}

function MemberModal({
  open,
  friends,
  onClose,
  onSave,
  showToast,
}: {
  open: boolean
  friends: PublicUser[]
  onClose: () => void
  onSave: (userId: number, role: SharedRole) => Promise<void>
  showToast: ShowToast
}) {
  const [userId, setUserId] = useState('')
  const [role, setRole] = useState<SharedRole>('member')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!userId) return
    setSaving(true)
    try {
      await onSave(Number(userId), role)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al agregar', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} title="Agregar miembro" onClose={onClose}>
      <div className="flex flex-col gap-3">
        <label className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>Amigo</label>
        <select value={userId} onChange={e => setUserId(e.target.value)} className="w-full px-4 py-3 rounded-xl text-sm" style={selectStyle}>
          <option value="">Selecciona un amigo</option>
          {friends.map(f => <option key={f.id} value={f.id}>{f.username}</option>)}
        </select>
        <label className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>Rol</label>
        <select value={role} onChange={e => setRole(e.target.value as SharedRole)} className="w-full px-4 py-3 rounded-xl text-sm" style={selectStyle}>
          <option value="member">Miembro</option>
          <option value="admin">Administrador</option>
          <option value="viewer">Solo lectura</option>
        </select>
        <button onClick={submit} disabled={saving || !userId} className="btn-primary w-full py-3 rounded-xl text-sm font-semibold mt-1">
          {saving ? 'Guardando…' : 'Agregar'}
        </button>
      </div>
    </Modal>
  )
}

function EntryModal({
  open,
  onClose,
  onSave,
  showToast,
}: {
  open: boolean
  onClose: () => void
  onSave: (body: { type: SharedEntryType; amount: number; date?: string; description?: string }) => Promise<void>
  showToast: ShowToast
}) {
  const [type, setType] = useState<SharedEntryType>('contribution')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(today())
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0) {
      showToast('Ingresa un monto válido', 'error')
      return
    }
    setSaving(true)
    try {
      await onSave({ type, amount: value, date, description: description.trim() || undefined })
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al registrar', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} title="Registrar movimiento" onClose={onClose}>
      <div className="flex flex-col gap-3">
        <label className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>Tipo</label>
        <select value={type} onChange={e => setType(e.target.value as SharedEntryType)} className="w-full px-4 py-3 rounded-xl text-sm" style={selectStyle}>
          {(Object.keys(ENTRY_LABEL) as SharedEntryType[]).map(t => <option key={t} value={t}>{ENTRY_LABEL[t]}</option>)}
        </select>
        <label className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>Monto</label>
        <input value={amount} onChange={e => setAmount(e.target.value)} type="number" min="0" step="0.01" className="w-full px-4 py-3 rounded-xl text-sm font-mono" style={inputStyle} />
        <label className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>Fecha</label>
        <input value={date} onChange={e => setDate(e.target.value)} type="date" className="w-full px-4 py-3 rounded-xl text-sm" style={inputStyle} />
        <label className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>Descripción (opcional)</label>
        <input value={description} onChange={e => setDescription(e.target.value)} className="w-full px-4 py-3 rounded-xl text-sm" style={inputStyle} />
        <button onClick={submit} disabled={saving} className="btn-primary w-full py-3 rounded-xl text-sm font-semibold mt-1">
          {saving ? 'Guardando…' : 'Registrar'}
        </button>
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Peer loans
// ---------------------------------------------------------------------------

function LoansTab({
  loans,
  friends,
  reload,
  showToast,
  myId,
}: {
  loans: PeerLoanApi[]
  friends: PublicUser[]
  reload: () => Promise<void>
  showToast: ShowToast
  myId: number
}) {
  const [createOpen, setCreateOpen] = useState(false)
  const [selected, setSelected] = useState<PeerLoanApi | null>(null)
  const [payOpen, setPayOpen] = useState(false)

  const handleVoid = async (loan: PeerLoanApi, paymentId: number) => {
    try {
      const res = await voidPeerLoanPayment(loan.id, paymentId)
      showToast('Pago anulado', 'success')
      setSelected(res.loan)
      await reload()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al anular', 'error')
    }
  }

  const handleSettle = async (loan: PeerLoanApi) => {
    try {
      const res = await settlePeerLoan(loan.id)
      showToast('Préstamo liquidado', 'success')
      setSelected(res.loan)
      await reload()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al liquidar', 'error')
    }
  }

  if (selected) {
    const loan = loans.find(l => l.id === selected.id) ?? selected
    const isLender = loan.lender_id === myId
    const counterpart = isLender ? loan.borrower : loan.lender
    return (
      <div className="flex flex-col gap-5">
        <button onClick={() => setSelected(null)} className="flex items-center gap-1 text-sm self-start" style={{ color: 'var(--text-2)' }}>
          <ChevronLeft size={16} /> Volver
        </button>

        <div className="glass rounded-2xl p-5" style={cardBorder}>
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-bold">{isLender ? 'Prestaste a' : 'Te prestó'} {counterpart.username}</h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{shortDate(loan.start_date)} · {loan.status === 'settled' ? 'Liquidado' : 'Abierto'}</p>
              {loan.description && <p className="text-xs mt-1" style={{ color: 'var(--text-2)' }}>{loan.description}</p>}
            </div>
            <div className="text-right">
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>Pendiente</p>
              <p className="text-xl font-bold font-mono" style={{ color: loan.pending_amount > 0 ? '#F87171' : '#06D6A0' }}>{fmt(Math.max(0, loan.pending_amount))}</p>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            {loan.status !== 'settled' && (
              <button onClick={() => setPayOpen(true)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium" style={{ background: 'rgba(124,58,237,0.18)', color: '#A78BFA' }}>
                <HandCoins size={15} /> Registrar pago
              </button>
            )}
            {isLender && loan.status !== 'settled' && (
              <button onClick={() => handleSettle(loan)} className="px-4 py-2.5 rounded-xl text-sm font-medium" style={{ background: 'var(--card-subtle)', color: 'var(--text-2)' }}>
                Liquidar
              </button>
            )}
          </div>
        </div>

        <div className="glass rounded-2xl p-5" style={cardBorder}>
          <h3 className="text-sm font-semibold mb-3">Pagos ({loan.payments.length})</h3>
          {loan.payments.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-3)' }}>Sin pagos registrados.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {loan.payments.map(p => (
                <div key={p.id} className="flex items-center justify-between px-3 py-2 rounded-xl" style={{ background: 'var(--card-subtle)', opacity: p.voided_at ? 0.5 : 1 }}>
                  <div>
                    <p className="text-sm font-mono">{fmt(p.amount)}</p>
                    <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>{p.user.username} · {shortDate(p.date)}</p>
                  </div>
                  {!p.voided_at && (p.payer_id === myId || isLender) && (
                    <button onClick={() => handleVoid(loan, p.id)} className="p-1.5 rounded-lg hover:bg-white/10" style={{ color: '#F87171' }} aria-label="Anular pago">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <PaymentModal
          open={payOpen}
          onClose={() => setPayOpen(false)}
          onSave={async body => {
            const res = await addPeerLoanPayment(loan.id, body)
            showToast('Pago registrado', 'success')
            setPayOpen(false)
            setSelected(res.loan)
            await reload()
          }}
          showToast={showToast}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Préstamos entre amigos</h3>
        <button onClick={() => setCreateOpen(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold btn-primary">
          <Plus size={15} /> Nuevo
        </button>
      </div>

      {loans.length === 0 ? (
        <Empty text="Registra préstamos con tus amigos para llevar el control." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {loans.map(loan => {
            const isLender = loan.lender_id === myId
            return (
              <button key={loan.id} onClick={() => setSelected(loan)} className="glass card-hover rounded-2xl p-5 text-left flex flex-col gap-1.5" style={cardBorder}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">{isLender ? `A ${loan.borrower.username}` : `De ${loan.lender.username}`}</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: loan.status === 'settled' ? 'rgba(6,214,160,0.15)' : 'rgba(245,158,11,0.15)', color: loan.status === 'settled' ? '#06D6A0' : '#F59E0B' }}>
                    {loan.status === 'settled' ? 'Liquidado' : 'Abierto'}
                  </span>
                </div>
                <span className="text-lg font-bold font-mono" style={{ color: '#A78BFA' }}>{fmt(loan.original_amount)}</span>
                <span className="text-xs" style={{ color: 'var(--text-3)' }}>Pendiente {fmt(Math.max(0, loan.pending_amount))}</span>
              </button>
            )
          })}
        </div>
      )}

      <LoanModal
        open={createOpen}
        friends={friends}
        onClose={() => setCreateOpen(false)}
        onSave={async body => {
          await createPeerLoan(body)
          showToast('Préstamo creado', 'success')
          setCreateOpen(false)
          await reload()
        }}
        showToast={showToast}
      />
    </div>
  )
}

function LoanModal({
  open,
  friends,
  onClose,
  onSave,
  showToast,
}: {
  open: boolean
  friends: PublicUser[]
  onClose: () => void
  onSave: (body: { borrower_id: number; original_amount: number; description?: string; start_date?: string; due_date?: string | null }) => Promise<void>
  showToast: ShowToast
}) {
  const [borrowerId, setBorrowerId] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    const value = Number(amount)
    if (!borrowerId) { showToast('Selecciona un amigo', 'error'); return }
    if (!Number.isFinite(value) || value <= 0) { showToast('Ingresa un monto válido', 'error'); return }
    setSaving(true)
    try {
      await onSave({
        borrower_id: Number(borrowerId),
        original_amount: value,
        description: description.trim() || undefined,
        start_date: today(),
        due_date: dueDate || null,
      })
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al crear', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} title="Nuevo préstamo" onClose={onClose}>
      <div className="flex flex-col gap-3">
        <label className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>Prestatario</label>
        <select value={borrowerId} onChange={e => setBorrowerId(e.target.value)} className="w-full px-4 py-3 rounded-xl text-sm" style={selectStyle}>
          <option value="">Selecciona un amigo</option>
          {friends.map(f => <option key={f.id} value={f.id}>{f.username}</option>)}
        </select>
        <label className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>Monto</label>
        <input value={amount} onChange={e => setAmount(e.target.value)} type="number" min="0" step="0.01" className="w-full px-4 py-3 rounded-xl text-sm font-mono" style={inputStyle} />
        <label className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>Descripción (opcional)</label>
        <input value={description} onChange={e => setDescription(e.target.value)} className="w-full px-4 py-3 rounded-xl text-sm" style={inputStyle} />
        <label className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>Fecha límite (opcional)</label>
        <input value={dueDate} onChange={e => setDueDate(e.target.value)} type="date" className="w-full px-4 py-3 rounded-xl text-sm" style={inputStyle} />
        <button onClick={submit} disabled={saving} className="btn-primary w-full py-3 rounded-xl text-sm font-semibold mt-1">
          {saving ? 'Guardando…' : 'Crear préstamo'}
        </button>
      </div>
    </Modal>
  )
}

function PaymentModal({
  open,
  onClose,
  onSave,
  showToast,
}: {
  open: boolean
  onClose: () => void
  onSave: (body: { amount: number; date?: string; method?: string; note?: string }) => Promise<void>
  showToast: ShowToast
}) {
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(today())
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0) { showToast('Ingresa un monto válido', 'error'); return }
    setSaving(true)
    try {
      await onSave({ amount: value, date, note: note.trim() || undefined })
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al registrar', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} title="Registrar pago" onClose={onClose}>
      <div className="flex flex-col gap-3">
        <label className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>Monto</label>
        <input value={amount} onChange={e => setAmount(e.target.value)} type="number" min="0" step="0.01" className="w-full px-4 py-3 rounded-xl text-sm font-mono" style={inputStyle} />
        <label className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>Fecha</label>
        <input value={date} onChange={e => setDate(e.target.value)} type="date" className="w-full px-4 py-3 rounded-xl text-sm" style={inputStyle} />
        <label className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>Nota (opcional)</label>
        <input value={note} onChange={e => setNote(e.target.value)} className="w-full px-4 py-3 rounded-xl text-sm" style={inputStyle} />
        <button onClick={submit} disabled={saving} className="btn-primary w-full py-3 rounded-xl text-sm font-semibold mt-1">
          {saving ? 'Guardando…' : 'Registrar pago'}
        </button>
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Shared goals
// ---------------------------------------------------------------------------

function GoalsTab({
  goals,
  accounts,
  reload,
  showToast,
  myId,
}: {
  goals: SharedGoalApi[]
  accounts: SharedAccountApi[]
  reload: () => Promise<void>
  showToast: ShowToast
  myId: number
}) {
  const [createOpen, setCreateOpen] = useState(false)
  const [selected, setSelected] = useState<SharedGoalApi | null>(null)
  const [contribOpen, setContribOpen] = useState(false)

  const accountName = (id: number) => accounts.find(a => a.id === id)?.name ?? 'Cuenta'

  const handleVoid = async (goal: SharedGoalApi, contributionId: number) => {
    try {
      await voidSharedGoalContribution(goal.id, contributionId)
      showToast('Aportación anulada', 'success')
      await reload()
      const fresh = (await fetchSharedGoals()).goals.find(g => g.id === goal.id) ?? null
      setSelected(fresh)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al anular', 'error')
    }
  }

  if (selected) {
    const goal = goals.find(g => g.id === selected.id) ?? selected
    const pct = Math.round(goal.progress * 100)
    return (
      <div className="flex flex-col gap-5">
        <button onClick={() => setSelected(null)} className="flex items-center gap-1 text-sm self-start" style={{ color: 'var(--text-2)' }}>
          <ChevronLeft size={16} /> Volver
        </button>

        <div className="glass rounded-2xl p-5" style={cardBorder}>
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-bold">{goal.name}</h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{accountName(goal.shared_account_id)} · meta para {shortDate(goal.target_date)}</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold font-mono" style={{ color: '#06D6A0' }}>{pct}%</p>
            </div>
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden mt-3" style={{ background: 'var(--border)' }}>
            <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, background: '#06D6A0' }} />
          </div>
          <p className="text-xs mt-2" style={{ color: 'var(--text-2)' }}>{fmt(goal.saved_amount)} de {fmt(goal.target_amount)}</p>
          <button onClick={() => setContribOpen(true)} className="btn-primary w-full py-2.5 rounded-xl text-sm font-semibold mt-3">
            Aportar
          </button>
        </div>

        <div className="glass rounded-2xl p-5" style={cardBorder}>
          <h3 className="text-sm font-semibold mb-3">Aportaciones ({goal.contributions.length})</h3>
          {goal.contributions.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-3)' }}>Sin aportaciones aún.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {goal.contributions.map(c => (
                <div key={c.id} className="flex items-center justify-between px-3 py-2 rounded-xl" style={{ background: 'var(--card-subtle)', opacity: c.voided_at ? 0.5 : 1 }}>
                  <div>
                    <p className="text-sm font-mono">{fmt(c.amount)}</p>
                    <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>{c.user.username} · {shortDate(c.date)}</p>
                  </div>
                  {!c.voided_at && (c.user_id === myId || goal.created_by === myId) && (
                    <button onClick={() => handleVoid(goal, c.id)} className="p-1.5 rounded-lg hover:bg-white/10" style={{ color: '#F87171' }} aria-label="Anular aportación">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <ContributionModal
          open={contribOpen}
          onClose={() => setContribOpen(false)}
          onSave={async body => {
            await addSharedGoalContribution(goal.id, body)
            showToast('Aportación registrada', 'success')
            setContribOpen(false)
            await reload()
            const fresh = (await fetchSharedGoals()).goals.find(g => g.id === goal.id) ?? null
            setSelected(fresh)
          }}
          showToast={showToast}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Metas compartidas</h3>
        <button onClick={() => setCreateOpen(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold btn-primary">
          <Plus size={15} /> Nueva
        </button>
      </div>

      {goals.length === 0 ? (
        <Empty text="Crea metas compartidas y alcanzarlas en equipo." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {goals.map(goal => {
            const pct = Math.round(goal.progress * 100)
            return (
              <button key={goal.id} onClick={() => setSelected(goal)} className="glass card-hover rounded-2xl p-5 text-left flex flex-col gap-2" style={cardBorder}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{goal.name}</span>
                  <Target size={16} color="#06D6A0" />
                </div>
                <span className="text-xs" style={{ color: 'var(--text-3)' }}>{accountName(goal.shared_account_id)}</span>
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, background: '#06D6A0' }} />
                </div>
                <span className="text-xs font-mono" style={{ color: 'var(--text-2)' }}>{fmt(goal.saved_amount)} / {fmt(goal.target_amount)} · {pct}%</span>
              </button>
            )
          })}
        </div>
      )}

      <GoalModal
        open={createOpen}
        accounts={accounts}
        onClose={() => setCreateOpen(false)}
        onSave={async body => {
          await createSharedGoal(body)
          showToast('Meta creada', 'success')
          setCreateOpen(false)
          await reload()
        }}
        showToast={showToast}
      />
    </div>
  )
}

function GoalModal({
  open,
  accounts,
  onClose,
  onSave,
  showToast,
}: {
  open: boolean
  accounts: SharedAccountApi[]
  onClose: () => void
  onSave: (body: { shared_account_id: number; name: string; target_amount: number; target_date?: string | null }) => Promise<void>
  showToast: ShowToast
}) {
  const [accountId, setAccountId] = useState('')
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [date, setDate] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (accounts.length > 0 && !accountId) setAccountId(String(accounts[0].id))
  }, [accounts, accountId])

  const submit = async () => {
    const value = Number(target)
    if (!name.trim()) { showToast('Ingresa un nombre', 'error'); return }
    if (!accountId) { showToast('Selecciona una cuenta', 'error'); return }
    if (!Number.isFinite(value) || value <= 0) { showToast('Ingresa una meta válida', 'error'); return }
    setSaving(true)
    try {
      await onSave({ shared_account_id: Number(accountId), name: name.trim(), target_amount: value, target_date: date || null })
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al crear', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} title="Nueva meta compartida" onClose={onClose}>
      <div className="flex flex-col gap-3">
        <label className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>Cuenta</label>
        <select value={accountId} onChange={e => setAccountId(e.target.value)} className="w-full px-4 py-3 rounded-xl text-sm" style={selectStyle}>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <label className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>Nombre</label>
        <input value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-3 rounded-xl text-sm" style={inputStyle} />
        <label className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>Meta</label>
        <input value={target} onChange={e => setTarget(e.target.value)} type="number" min="0" step="0.01" className="w-full px-4 py-3 rounded-xl text-sm font-mono" style={inputStyle} />
        <label className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>Fecha objetivo (opcional)</label>
        <input value={date} onChange={e => setDate(e.target.value)} type="date" className="w-full px-4 py-3 rounded-xl text-sm" style={inputStyle} />
        <button onClick={submit} disabled={saving} className="btn-primary w-full py-3 rounded-xl text-sm font-semibold mt-1">
          {saving ? 'Guardando…' : 'Crear meta'}
        </button>
      </div>
    </Modal>
  )
}

function ContributionModal({
  open,
  onClose,
  onSave,
  showToast,
}: {
  open: boolean
  onClose: () => void
  onSave: (body: { amount: number; date?: string; note?: string }) => Promise<void>
  showToast: ShowToast
}) {
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(today())
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0) { showToast('Ingresa un monto válido', 'error'); return }
    setSaving(true)
    try {
      await onSave({ amount: value, date, note: note.trim() || undefined })
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al aportar', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} title="Aportar a la meta" onClose={onClose}>
      <div className="flex flex-col gap-3">
        <label className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>Monto</label>
        <input value={amount} onChange={e => setAmount(e.target.value)} type="number" min="0" step="0.01" className="w-full px-4 py-3 rounded-xl text-sm font-mono" style={inputStyle} />
        <label className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>Fecha</label>
        <input value={date} onChange={e => setDate(e.target.value)} type="date" className="w-full px-4 py-3 rounded-xl text-sm" style={inputStyle} />
        <label className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>Nota (opcional)</label>
        <input value={note} onChange={e => setNote(e.target.value)} className="w-full px-4 py-3 rounded-xl text-sm" style={inputStyle} />
        <button onClick={submit} disabled={saving} className="btn-primary w-full py-3 rounded-xl text-sm font-semibold mt-1">
          {saving ? 'Guardando…' : 'Aportar'}
        </button>
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function SharedScreen({
  showToast,
  currentUser,
}: {
  showToast: ShowToast
  currentUser: ApiUser | null
}) {
  const [tab, setTab] = useState<Tab>('friends')
  const [friendsData, setFriendsData] = useState<FriendsData>({ friends: [], incoming: [], outgoing: [] })
  const [accounts, setAccounts] = useState<SharedAccountApi[]>([])
  const [loans, setLoans] = useState<PeerLoanApi[]>([])
  const [goals, setGoals] = useState<SharedGoalApi[]>([])
  const [loading, setLoading] = useState(true)

  const myId = currentUser?.id ?? 0

  const loadAll = async () => {
    setLoading(true)
    try {
      const [friends, accountsRes, loansRes, goalsRes] = await Promise.all([
        fetchFriends(),
        fetchSharedAccounts(),
        fetchPeerLoans(),
        fetchSharedGoals(),
      ])
      setFriendsData(friends)
      setAccounts(accountsRes.accounts)
      setLoans(loansRes.loans)
      setGoals(goalsRes.goals)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al cargar', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAll() }, [])

  const friendUsers: PublicUser[] = friendsData.friends.map(f => f.user)

  const TABS: { id: Tab; label: string }[] = [
    { id: 'friends', label: 'Amigos' },
    { id: 'accounts', label: 'Cuentas' },
    { id: 'loans', label: 'Préstamos' },
    { id: 'goals', label: 'Metas' },
  ]

  return (
    <div className="flex flex-col gap-5 pb-6">
      <div>
        <h2 className="text-xl font-bold">Finanzas compartidas</h2>
        <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
          Amigos, cuentas en común, préstamos y metas con tus contactos.
        </p>
      </div>

      <div className="flex gap-1 p-1 rounded-xl overflow-x-auto" style={{ background: 'var(--card-subtle)' }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors"
            style={tab === t.id ? { background: 'var(--card)', color: '#A78BFA' } : { color: 'var(--text-2)' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner />
      ) : tab === 'friends' ? (
        <FriendsTab data={friendsData} reload={loadAll} showToast={showToast} />
      ) : tab === 'accounts' ? (
        <AccountsTab accounts={accounts} friends={friendUsers} reload={loadAll} showToast={showToast} myId={myId} />
      ) : tab === 'loans' ? (
        <LoansTab loans={loans} friends={friendUsers} reload={loadAll} showToast={showToast} myId={myId} />
      ) : (
        <GoalsTab goals={goals} accounts={accounts} reload={loadAll} showToast={showToast} myId={myId} />
      )}
    </div>
  )
}
