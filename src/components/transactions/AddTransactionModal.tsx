import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { createTransaction, fetchTransactions, updateTransaction, type ApiTransaction } from '@/api/transactions'
import { fetchAccounts, type ApiAccount } from '@/api/accounts'
import { accountBalance } from '@/utils/accountBalance'
import { fmt } from '@/utils/format'

const CATEGORIES = [
  'Comida', 'Transporte', 'Vivienda', 'Salud', 'Educación',
  'Entretenimiento', 'Suscripciones', 'Servicios', 'Compras', 'Ropa', 'Otros',
]

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Ninguno' },
  { value: 'need', label: 'Necesidad' },
  { value: 'want', label: 'Deseo' },
  { value: 'save', label: 'Ahorro' },
]

const TYPE_LABELS: Record<string, string> = {
  income: 'Ingreso',
  expense: 'Gasto',
  transfer: 'Transferencia',
  debt_payment: 'Pago de deuda',
  receivable: 'Por cobrar',
  investment: 'Inversión',
  adjustment: 'Ajuste',
}

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function AddTransactionModal({ open, onClose, onAdd, transaction }: {
  open: boolean
  onClose: () => void
  onAdd: () => void
  transaction?: ApiTransaction | null
}) {
  const editing = !!transaction
  const [desc, setDesc] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(today())
  const [type, setType] = useState<string>('expense')
  const [cat, setCat] = useState('Comida')
  const [budgetType, setBudgetType] = useState('')
  const [accounts, setAccounts] = useState<ApiAccount[]>([])
  const [txns, setTxns] = useState<ApiTransaction[]>([])
  const [accountId, setAccountId] = useState<number | null>(null)
  const [destAccountId, setDestAccountId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setAccounts([])
    setTxns([])
    if (transaction) {
      setDesc(transaction.description ?? '')
      setAmount(String(Math.abs(Number(transaction.amount))))
      setDate((transaction.date ?? '').slice(0, 10) || today())
      setType(transaction.type)
      const existingCat = transaction.category ?? 'Comida'
      setCat(CATEGORIES.includes(existingCat) ? existingCat : existingCat)
      setBudgetType(transaction.budget_type ?? '')
      setDestAccountId(transaction.destination_account_id ?? null)
    } else {
      setDesc(''); setAmount(''); setDate(today()); setType('expense'); setCat('Comida'); setBudgetType(''); setDestAccountId(null)
    }
    fetchAccounts()
      .then(list => {
        setAccounts(list)
        setAccountId(transaction?.account_id ?? list[0]?.id ?? null)
        setDestAccountId(prev => prev ?? list[1]?.id ?? list[0]?.id ?? null)
      })
      .catch(e => {
        setAccountId(transaction?.account_id ?? null)
        setError(e instanceof Error ? e.message : 'Error al cargar cuentas')
      })
    fetchTransactions()
      .then(setTxns)
      .catch(() => undefined)
  }, [open, transaction])

  const isStandard = ['expense', 'income', 'transfer'].includes(type)
  const isTransfer = type === 'transfer'
  const effectiveType: string = isStandard ? type : (transaction?.type ?? 'expense')
  const catOptions = CATEGORIES.includes(cat) ? CATEGORIES : [cat, ...CATEGORIES]

  const displayTxns = useMemo(() => {
    if (!editing || !transaction) return txns
    return [
      ...txns.filter(t => t.id !== transaction.id),
      {
        ...transaction,
        amount: Number(amount) || 0,
        account_id: accountId,
        type: effectiveType,
      },
    ]
  }, [txns, editing, transaction, amount, accountId, effectiveType])

  const handleSave = async () => {
    if (!amount || Number(amount) <= 0) return
    if (!isTransfer && !desc) return
    if (isTransfer && (accountId == null || destAccountId == null)) {
      setError('Selecciona la cuenta de origen y la de destino')
      return
    }
    if (isTransfer && accountId === destAccountId) {
      setError('La cuenta de origen y la de destino deben ser diferentes')
      return
    }
    if (isTransfer && accountId != null) {
      const sourceAccount = accounts.find(a => a.id === accountId)
      if (sourceAccount && sourceAccount.type === 'credit') {
        setError('No puedes transferir desde una tarjeta de crédito')
        return
      }
      const balanceTxns = editing && transaction
        ? txns.filter(t => t.id !== transaction.id)
        : txns
      const balance = accountBalance(sourceAccount!, balanceTxns)
      if (balance + 0.005 < Number(amount)) {
        setError(`Saldo insuficiente en ${sourceAccount!.name}: solo tienes ${fmt(balance)}`)
        return
      }
    }
    setSaving(true)
    setError(null)
    const payload = {
      date,
      description: (isTransfer ? desc.trim() || 'Transferencia' : desc.trim()),
      amount: Math.abs(Number(amount)),
      type: effectiveType,
      category: isTransfer ? 'Transferencia' : cat,
      budget_type: isTransfer ? null : (budgetType || null),
      account_id: accountId,
      destination_account_id: isTransfer
        ? destAccountId
        : editing ? transaction?.destination_account_id ?? null : undefined,
    }
    try {
      if (editing) {
        await updateTransaction(transaction!.id, payload)
      } else {
        await createTransaction(payload)
      }
      onAdd()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ocurrió un error al guardar')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
      <div className="glass animate-slide-up rounded-2xl p-6 w-full max-w-md" style={{ border: '1px solid rgba(124,58,237,0.2)' }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold">{editing ? 'Editar Movimiento' : 'Registrar Movimiento'}</h3>
          <button onClick={onClose} style={{ color: '#6B6B85' }}><X size={20} /></button>
        </div>

        {isStandard ? (
          <div className="flex rounded-xl p-1 mb-4" style={{ background: 'rgba(255,255,255,0.05)' }}>
            {(['expense', 'income', 'transfer'] as const).map(t => (
              <button
                key={t}
                onClick={() => setType(t)}
                className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
                style={type === t
                  ? { background: t === 'expense' ? '#EF4444' : t === 'income' ? '#06D6A0' : '#3B82F6', color: '#fff' }
                  : { color: '#A0A0B8' }}
              >
                {t === 'expense' ? '↑ Gasto' : t === 'income' ? '↓ Ingreso' : '⇄ Transferencia'}
              </button>
            ))}
          </div>
        ) : (
          <div className="mb-4 px-3 py-2 rounded-xl text-xs font-medium" style={{ background: 'rgba(255,255,255,0.05)', color: '#A0A0B8' }}>
            Tipo: {TYPE_LABELS[type] ?? type}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <input
            value={desc}
            onChange={e => setDesc(e.target.value)}
            placeholder="Descripción"
            className="w-full px-4 py-3 rounded-xl text-sm"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
          />
          <div className="flex gap-3">
            <input
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="Monto $0.00"
              type="number"
              className="flex-1 px-4 py-3 rounded-xl text-sm font-mono"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
            />
            <input
              value={date}
              onChange={e => setDate(e.target.value)}
              type="date"
              className="px-3 py-3 rounded-xl text-sm"
              style={{ background: 'rgba(26,26,46,0.9)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
            />
          </div>

          {!isTransfer && (
          <div>
            <p className="text-xs mb-1" style={{ color: '#6B6B85' }}>
              Categoría específica
            </p>
            <select
              value={cat}
              onChange={e => setCat(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm"
              style={{ background: 'rgba(26,26,46,0.9)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
            >
              {catOptions.map(c => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          )}

          {!isTransfer && (
            <div>
              <p className="text-xs mb-1" style={{ color: '#6B6B85' }}>
                Clasificación 50/30/20
              </p>
              <select
                value={budgetType}
                onChange={e => setBudgetType(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm"
                style={{ background: 'rgba(26,26,46,0.9)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              >
                {TYPE_OPTIONS.map(o => (
                  <option key={o.value || 'none'} value={o.value}>{o.label}</option>
                ))}
              </select>
              <p className="text-xs mt-1" style={{ color: '#6B6B85' }}>
                Ej. despensa va en “Necesidad”; un restaurante en “Deseo”.
              </p>
            </div>
          )}

          <div>
            <p className="text-xs mb-1" style={{ color: '#6B6B85' }}>
              Cuenta {isTransfer ? 'de origen' : ''}
            </p>
            <select
              value={accountId ?? ''}
              onChange={e => setAccountId(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-4 py-3 rounded-xl text-sm"
              style={{ background: 'rgba(26,26,46,0.9)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
            >
              {accounts.length === 0 && <option value="">Sin cuentas</option>}
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.name} · {fmt(accountBalance(a, displayTxns))}</option>
              ))}
            </select>
          </div>

          {isTransfer && (
            <div>
              <p className="text-xs mb-1" style={{ color: '#6B6B85' }}>
                Cuenta de destino
              </p>
              <select
                value={destAccountId ?? ''}
                onChange={e => setDestAccountId(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-4 py-3 rounded-xl text-sm"
                style={{ background: 'rgba(26,26,46,0.9)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              >
                {accounts.length === 0 && <option value="">Sin cuentas</option>}
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.name} · {fmt(accountBalance(a, displayTxns))}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {error && (
          <p className="mt-3 text-xs" style={{ color: '#EF4444' }}>{error}</p>
        )}

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-medium" style={{ background: 'rgba(255,255,255,0.06)', color: '#A0A0B8' }}>
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !amount || Number(amount) <= 0 || (!isTransfer && !desc) || (isTransfer && (accountId == null || destAccountId == null))}
            className="btn-primary flex-1 py-3 rounded-xl text-sm font-semibold"
          >
            {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}