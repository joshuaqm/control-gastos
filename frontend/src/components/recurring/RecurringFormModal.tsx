import { useState } from 'react'
import { X } from 'lucide-react'
import type { ApiRecurring } from '@/api/recurring'
import type { ApiAccount } from '@/api/accounts'

export interface RecurringFormData {
  name: string
  amount: number
  frequency: string
  next_date: string
  category?: string | null
  budget_type?: string | null
  account_id: number | null
  is_active?: boolean
  notes?: string | null
}

const FREQUENCIES = [
  { value: 'monthly', label: 'Mensual' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'biweekly', label: 'Quincenal' },
  { value: 'yearly', label: 'Anual' },
] as const

const BUDGET_TYPES = [
  { value: 'need', label: 'Necesidad' },
  { value: 'want', label: 'Deseo' },
  { value: 'save', label: 'Ahorro' },
] as const

export default function RecurringFormModal({
  open,
  recurring,
  accounts,
  onClose,
  onSave,
}: {
  open: boolean
  recurring: ApiRecurring | null
  accounts: ApiAccount[]
  onClose: () => void
  onSave: (data: RecurringFormData) => Promise<void>
}) {
  const [name, setName] = useState(recurring?.name ?? '')
  const [amount, setAmount] = useState(recurring ? recurring.amount.toString() : '')
  const [frequency, setFrequency] = useState(recurring?.frequency ?? 'monthly')
  const [nextDate, setNextDate] = useState(recurring?.next_date?.slice(0, 10) ?? '')
  const [category, setCategory] = useState(recurring?.category ?? '')
  const [budgetType, setBudgetType] = useState(recurring?.budget_type ?? '')
  const [accountId, setAccountId] = useState(recurring?.account_id?.toString() ?? (accounts[0]?.id.toString() ?? ''))
  const [isActive, setIsActive] = useState(recurring?.is_active ?? true)
  const [notes, setNotes] = useState(recurring?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  if (!open) return null

  const handleSave = async () => {
    if (!name.trim()) {
      setError('El nombre es obligatorio')
      return
    }
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      setError('Ingresa un monto válido')
      return
    }
    if (!nextDate) {
      setError('La fecha del próximo cobro es obligatoria')
      return
    }
    if (!accountId) {
      setError('Selecciona una cuenta')
      return
    }

    setSaving(true)
    setError('')
    try {
      await onSave({
        name: name.trim(),
        amount: Number(amount),
        frequency,
        next_date: nextDate,
        category: category.trim() || null,
        budget_type: budgetType || null,
        account_id: Number(accountId),
        is_active: isActive,
        notes: notes.trim() || null,
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
          <h3 className="text-lg font-semibold">{recurring ? 'Editar pago recurrente' : 'Nuevo pago recurrente'}</h3>
          <button onClick={onClose} style={{ color: '#6B6B85' }}><X size={20} /></button>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#A0A0B8' }}>Nombre</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej. Netflix, Gimnasio, Spotify…"
              className="w-full px-4 py-3 rounded-xl text-sm"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#A0A0B8' }}>Monto</label>
              <input
                value={amount}
                onChange={e => setAmount(e.target.value)}
                type="number"
                step="0.01"
                min="0"
                className="w-full px-4 py-3 rounded-xl text-sm font-mono"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#A0A0B8' }}>Frecuencia</label>
              <select
                value={frequency}
                onChange={e => setFrequency(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm"
                style={{ background: 'rgba(26,26,46,0.9)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              >
                {FREQUENCIES.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#A0A0B8' }}>Próximo cobro</label>
              <input
                value={nextDate}
                onChange={e => setNextDate(e.target.value)}
                type="date"
                className="w-full px-4 py-3 rounded-xl text-sm"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#A0A0B8' }}>Categoría</label>
              <input
                value={category}
                onChange={e => setCategory(e.target.value)}
                placeholder="Ej. Suscripciones"
                className="w-full px-4 py-3 rounded-xl text-sm"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#A0A0B8' }}>Cuenta</label>
              <select
                value={accountId}
                onChange={e => setAccountId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm"
                style={{ background: 'rgba(26,26,46,0.9)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              >
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#A0A0B8' }}>Clasificación 50/30/20</label>
              <select
                value={budgetType}
                onChange={e => setBudgetType(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm"
                style={{ background: 'rgba(26,26,46,0.9)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              >
                <option value="">Sin clasificar</option>
                {BUDGET_TYPES.map(b => (
                  <option key={b.value} value={b.value}>{b.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#A0A0B8' }}>Notas (opcional)</label>
            <input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm"
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
            Recurrente activo
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