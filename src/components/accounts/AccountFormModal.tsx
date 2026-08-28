import { useState } from 'react'
import { X } from 'lucide-react'
import type { ApiAccount } from '@/api/accounts'

type AccountType = ApiAccount['type']

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: 'debit', label: 'Débito' },
  { value: 'credit', label: 'Crédito' },
  { value: 'cash', label: 'Efectivo' },
  { value: 'savings', label: 'Ahorro' },
  { value: 'investment', label: 'Inversión' },
]

export default function AccountFormModal({
  open,
  account,
  onClose,
  onSave,
}: {
  open: boolean
  account: ApiAccount | null
  onClose: () => void
  onSave: (data: Partial<ApiAccount>) => Promise<void>
}) {
  const [name, setName] = useState(account?.name ?? '')
  const [type, setType] = useState<AccountType>(account?.type ?? 'debit')
  const [balance, setBalance] = useState(account?.balance?.toString() ?? account?.initial_balance?.toString() ?? '0')
  const [creditLimit, setCreditLimit] = useState(account?.credit_limit?.toString() ?? '')
  const [interestRate, setInterestRate] = useState(account?.interest_rate?.toString() ?? '')
  const [cutoffDay, setCutoffDay] = useState(account?.cutoff_day?.toString() ?? '')
  const [paymentDueDay, setPaymentDueDay] = useState(account?.payment_due_day?.toString() ?? '')
  const [isActive, setIsActive] = useState(account?.is_active ?? true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  if (!open) return null

  const isCredit = type === 'credit'

  const handleSave = async () => {
    if (!name.trim()) {
      setError('El nombre es obligatorio')
      return
    }
    if (isCredit && creditLimit && Number(creditLimit) <= 0) {
      setError('El límite de crédito debe ser mayor a 0')
      return
    }
    const parseDay = (value: string): number | null => {
      const day = Number(value)
      return value && Number.isInteger(day) && day >= 1 && day <= 31 ? day : null
    }
    const cutoff = isCredit && cutoffDay ? parseDay(cutoffDay) : null
    const due = isCredit && paymentDueDay ? parseDay(paymentDueDay) : null
    if (isCredit && (cutoffDay || paymentDueDay) && (cutoff === null || due === null)) {
      setError('La fecha de corte y límite de pago deben ser días entre 1 y 31')
      return
    }

    setSaving(true)
    setError('')
    try {
      await onSave({
        name: name.trim(),
        type,
        initial_balance: Number(balance) || 0,
        credit_limit: isCredit && creditLimit ? Number(creditLimit) : null,
        interest_rate: interestRate ? Number(interestRate) : null,
        cutoff_day: cutoff,
        payment_due_day: due,
        is_active: isActive,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
      <div className="glass animate-slide-up rounded-2xl p-6 w-full max-w-md" style={{ border: '1px solid rgba(124,58,237,0.2)' }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold">{account ? 'Editar Cuenta' : 'Registrar Cuenta'}</h3>
          <button onClick={onClose} style={{ color: '#6B6B85' }}><X size={20} /></button>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#A0A0B8' }}>Nombre</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Nombre de la cuenta"
              className="w-full px-4 py-3 rounded-xl text-sm"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#A0A0B8' }}>Tipo</label>
            <select
              value={type}
              onChange={e => setType(e.target.value as AccountType)}
              className="w-full px-4 py-3 rounded-xl text-sm"
              style={{ background: 'rgba(26,26,46,0.9)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
            >
              {ACCOUNT_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#A0A0B8' }}>Saldo</label>
            <input
              value={balance}
              onChange={e => setBalance(e.target.value)}
              type="number"
              step="0.01"
              className="w-full px-4 py-3 rounded-xl text-sm font-mono"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
            />
          </div>

          {isCredit && (
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#A0A0B8' }}>Límite de crédito</label>
              <input
                value={creditLimit}
                onChange={e => setCreditLimit(e.target.value)}
                type="number"
                step="0.01"
                className="w-full px-4 py-3 rounded-xl text-sm font-mono"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              />
            </div>
          )}

          {isCredit && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#A0A0B8' }}>Fecha de corte (día)</label>
                <input
                  value={cutoffDay}
                  onChange={e => setCutoffDay(e.target.value)}
                  type="number"
                  min="1"
                  max="31"
                  placeholder="Ej. 20"
                  className="w-full px-4 py-3 rounded-xl text-sm font-mono"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#A0A0B8' }}>Límite de pago (día)</label>
                <input
                  value={paymentDueDay}
                  onChange={e => setPaymentDueDay(e.target.value)}
                  type="number"
                  min="1"
                  max="31"
                  placeholder="Ej. 25"
                  className="w-full px-4 py-3 rounded-xl text-sm font-mono"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#A0A0B8' }}>Tasa de interés (%)</label>
            <input
              value={interestRate}
              onChange={e => setInterestRate(e.target.value)}
              type="number"
              step="0.01"
              className="w-full px-4 py-3 rounded-xl text-sm font-mono"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
            />
          </div>

          <label className="flex items-center gap-3 text-sm cursor-pointer" style={{ color: '#A0A0B8' }}>
            <input
              type="checkbox"
              checked={isActive}
              onChange={e => setIsActive(e.target.checked)}
              className="w-4 h-4 accent-purple-600"
            />
            Cuenta activa
          </label>
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
              'Guardar'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}