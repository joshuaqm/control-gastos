import { useEffect, useState } from 'react'
import { Banknote, CreditCard, Landmark, Pencil, PiggyBank, Plus, Trash2, TrendingUp, type LucideIcon } from 'lucide-react'
import AccountFormModal from '@/components/accounts/AccountFormModal'
import { createAccount, deleteAccount, fetchAccounts, updateAccount, type ApiAccount } from '@/api/accounts'
import { fetchTransactions, type ApiTransaction } from '@/api/transactions'
import { fmt } from '@/utils/format'
import type { ShowToast } from '@/types'

const TYPE_META: Record<ApiAccount['type'], { label: string; icon: LucideIcon; color: string }> = {
  debit: { label: 'Débito', icon: Landmark, color: '#3B82F6' },
  credit: { label: 'Crédito', icon: CreditCard, color: '#EF4444' },
  cash: { label: 'Efectivo', icon: Banknote, color: '#F59E0B' },
  savings: { label: 'Ahorro', icon: PiggyBank, color: '#06D6A0' },
  investment: { label: 'Inversión', icon: TrendingUp, color: '#8B5CF6' },
}

function creditUsed(txns: ApiTransaction[], accountId: number): number {
  return txns.reduce((sum, t) => {
    if (t.account_id === accountId) {
      if (t.type === 'expense' || t.type === 'transfer') return sum + Number(t.amount)
      if (t.type === 'income') return sum - Number(t.amount)
    }
    if (t.destination_account_id === accountId) return sum - Number(t.amount)
    return sum
  }, 0)
}

export default function AccountsScreen({ showToast }: { showToast: ShowToast }) {
  const [accounts, setAccounts] = useState<ApiAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ApiAccount | null>(null)
  const [accountsWithMovements, setAccountsWithMovements] = useState<Set<number>>(new Set())
  const [txns, setTxns] = useState<ApiTransaction[]>([])

  const load = async () => {
    setLoading(true)
    try {
      const [list, txns] = await Promise.all([fetchAccounts(), fetchTransactions()])
      setAccounts(list)
      setTxns(txns)
      setAccountsWithMovements(new Set(txns.map(t => t.account_id).filter((id): id is number => id !== null)))
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al cargar cuentas', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (account: ApiAccount) => {
    setEditing(account)
    setModalOpen(true)
  }

  const handleSave = async (data: Partial<ApiAccount>) => {
    if (editing) {
      await updateAccount(editing.id, data)
      showToast('Cuenta actualizada', 'success')
    } else {
      await createAccount(data)
      showToast('Cuenta registrada', 'success')
    }
    setModalOpen(false)
    await load()
  }

  const handleDelete = async (account: ApiAccount) => {
    if (accountsWithMovements.has(account.id)) {
      showToast('No se puede eliminar: la cuenta tiene movimientos', 'error')
      return
    }
    if (!window.confirm(`¿Eliminar la cuenta "${account.name}"?`)) return
    try {
      await deleteAccount(account.id)
      showToast('Cuenta eliminada', 'success')
      await load()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al eliminar cuenta', 'error')
    }
  }

  return (
    <div className="flex flex-col gap-5 pb-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Cuentas</h2>
        <button
          onClick={openCreate}
          className="btn-primary flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
        >
          <Plus size={16} />
          Nueva Cuenta
        </button>
      </div>

      {loading ? (
        <div className="py-16 flex justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-purple-600 animate-spin" />
        </div>
      ) : accounts.length === 0 ? (
        <div className="py-16 text-center text-sm" style={{ color: '#6B6B85' }}>
          No hay cuentas registradas. Crea una con el botón "Nueva Cuenta".
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {accounts.map(a => {
            const meta = TYPE_META[a.type]
            const Icon = meta.icon
            const isCredit = a.type === 'credit'
            const used = isCredit ? creditUsed(txns, a.id) : 0
            const creditLimit = a.credit_limit ?? 0
            const available = isCredit ? Math.max(0, creditLimit - used) : 0
            const usedPct = isCredit && creditLimit > 0 ? Math.min(100, Math.round((used / creditLimit) * 100)) : 0
            return (
              <div
                key={a.id}
                className="glass card-hover rounded-2xl p-5 relative overflow-hidden"
                style={{ border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <div className="absolute -bottom-8 -right-8 w-32 h-32 rounded-full opacity-10" style={{ background: meta.color }} />
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${meta.color}22` }}>
                      <Icon size={20} style={{ color: meta.color }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{a.name}</p>
                      <p className="text-xs" style={{ color: '#6B6B85' }}>{meta.label}</p>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full" style={{ background: `${meta.color}22`, color: meta.color }}>
                    {a.is_active ? meta.label : 'Inactiva'}
                  </span>
                </div>

                {isCredit ? (
                  <div>
                    <p className="text-3xl font-bold font-mono" style={{ color: '#fff' }}>{fmt(available)}</p>
                    <p className="text-xs mt-1" style={{ color: '#6B6B85' }}>Saldo disponible</p>
                    <div className="mt-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span style={{ color: '#6B6B85' }}>Usado: {fmt(used)}</span>
                        <span style={{ color: meta.color }}>{usedPct}% del límite</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                        <div
                          className="h-full rounded-full ml-auto"
                          style={{ width: `${100 - usedPct}%`, background: meta.color }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-3xl font-bold font-mono" style={{ color: '#fff' }}>{fmt(a.initial_balance)}</p>
                )}

                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: '#6B6B85' }}>
                  {a.credit_limit != null && (
                    <span>Límite: {fmt(a.credit_limit)}</span>
                  )}
                  {a.interest_rate != null && (
                    <span>Tasa: {a.interest_rate}%</span>
                  )}
                  {isCredit && a.cutoff_day != null && (
                    <span>Corte: día {a.cutoff_day}</span>
                  )}
                  {isCredit && a.payment_due_day != null && (
                    <span>Pago: día {a.payment_due_day}</span>
                  )}
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => openEdit(a)}
                    className="flex-1 py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-colors hover:bg-white/10"
                    style={{ background: 'rgba(255,255,255,0.06)', color: '#A0A0B8' }}
                  >
                    <Pencil size={14} /> Editar
                  </button>
                  <button
                    onClick={() => handleDelete(a)}
                    disabled={accountsWithMovements.has(a.id)}
                    title={accountsWithMovements.has(a.id) ? 'No se puede eliminar: tiene movimientos' : 'Eliminar cuenta'}
                    className="flex-1 py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-colors"
                    style={{
                      background: 'rgba(239,68,68,0.08)',
                      color: accountsWithMovements.has(a.id) ? '#4B5563' : '#F87171',
                      border: '1px solid rgba(239,68,68,0.2)',
                      cursor: accountsWithMovements.has(a.id) ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <Trash2 size={14} /> Eliminar
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <AccountFormModal
        key={editing?.id ?? 'new'}
        open={modalOpen}
        account={editing}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />

      <button
        onClick={openCreate}
        className="btn-primary fixed bottom-20 sm:bottom-6 right-6 w-14 h-14 rounded-2xl flex items-center justify-center z-30 animate-pulse-glow sm:hidden"
      >
        <Plus size={24} color="white" />
      </button>
    </div>
  )
}