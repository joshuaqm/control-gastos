import { useState } from 'react'
import { X } from 'lucide-react'
import type { ApiGoal } from '@/api/goals'
import type { ApiAccount } from '@/api/accounts'

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function DepositModal({
  open,
  goal,
  accounts,
  onClose,
  onSubmit,
}: {
  open: boolean
  goal: ApiGoal | null
  accounts: ApiAccount[]
  onClose: () => void
  onSubmit: (data: { amount: number; account_id: number | null; date: string }) => Promise<void>
}) {
  const [amount, setAmount] = useState('')
  const [accountId, setAccountId] = useState('')
  const [date, setDate] = useState(today())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  if (!open) return null

  const sourceAccounts = accounts.filter(a => a.type !== 'credit')

  const handleSave = async () => {
    const amt = Number(amount)
    if (!Number.isFinite(amt) || amt <= 0) {
      setError('Ingresa un monto válido')
      return
    }
    if (!accountId) {
      setError('Selecciona la cuenta de origen')
      return
    }

    setSaving(true)
    setError('')
    try {
      await onSubmit({ amount: amt, account_id: Number(accountId), date })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error')
    } finally {
      setSaving(false)
    }
  }

  const remaining = goal ? Math.max(0, Number(goal.target_amount) - Number(goal.current_amount)) : 0

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
      <div className="glass animate-slide-up rounded-2xl p-6 w-full max-w-md" style={{ border: '1px solid rgba(124,58,237,0.2)' }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold">Abonar a meta</h3>
          <button onClick={onClose} style={{ color: '#6B6B85' }}><X size={20} /></button>
        </div>

        <p className="text-xs mb-4 px-3 py-2 rounded-lg" style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.25)', color: '#C4B5FD' }}>
          {goal?.name ?? ''} · te faltan {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(remaining)} para completarla. El dinero saldrá de la cuenta de origen y se registrará un movimiento de ahorro.
        </p>

        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#A0A0B8' }}>Monto a abonar</label>
            <input
              value={amount}
              onChange={e => setAmount(e.target.value)}
              type="number"
              step="0.01"
              min="0"
              autoFocus
              className="w-full px-4 py-3 rounded-xl text-sm font-mono"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#A0A0B8' }}>Cuenta de origen</label>
            <select
              value={accountId}
              onChange={e => setAccountId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm"
              style={{ background: 'rgba(26,26,46,0.9)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
            >
              <option value="">Selecciona una cuenta</option>
              {sourceAccounts.map(a => (
                <option key={a.id} value={a.id}>{a.name} · {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(a.balance ?? a.initial_balance)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#A0A0B8' }}>Fecha</label>
            <input
              value={date}
              onChange={e => setDate(e.target.value)}
              type="date"
              className="w-full px-4 py-3 rounded-xl text-sm"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
            />
          </div>
        </div>

        {error && (
          <div className="mt-3 px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#F87171' }}>
            {error}
          </div>
        )}

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-medium" style={{ background: 'rgba(255,255,255,0.06)', color: '#A0A0B8' }}>
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center"
          >
            {saving ? (
              <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            ) : (
              'Abonar'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}