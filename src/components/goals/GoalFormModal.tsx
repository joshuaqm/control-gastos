import { useState } from 'react'
import { X } from 'lucide-react'
import type { ApiGoal } from '@/api/goals'
import type { ApiAccount } from '@/api/accounts'

export interface GoalFormData {
  name: string
  target_amount: number
  current_amount?: number
  target_date?: string | null
  priority?: number
  account_id?: number | null
  notes?: string | null
}

export default function GoalFormModal({
  open,
  goal,
  accounts,
  onClose,
  onSave,
}: {
  open: boolean
  goal: ApiGoal | null
  accounts: ApiAccount[]
  onClose: () => void
  onSave: (data: GoalFormData) => Promise<void>
}) {
  const [name, setName] = useState(goal?.name ?? '')
  const [targetAmount, setTargetAmount] = useState(goal ? goal.target_amount.toString() : '')
  const [currentAmount, setCurrentAmount] = useState(goal ? goal.current_amount.toString() : '0')
  const [targetDate, setTargetDate] = useState(goal?.target_date?.slice(0, 10) ?? '')
  const [accountId, setAccountId] = useState(goal?.account_id?.toString() ?? '')
  const [notes, setNotes] = useState(goal?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  if (!open) return null

  const handleSave = async () => {
    if (!name.trim()) {
      setError('El nombre es obligatorio')
      return
    }
    if (!Number.isFinite(Number(targetAmount)) || Number(targetAmount) <= 0) {
      setError('Ingresa una meta de ahorro válida')
      return
    }
    if (!Number.isFinite(Number(currentAmount)) || Number(currentAmount) < 0) {
      setError('Ingresa un monto actual válido')
      return
    }

    setSaving(true)
    setError('')
    try {
      await onSave({
        name: name.trim(),
        target_amount: Number(targetAmount),
        current_amount: Number(currentAmount),
        target_date: targetDate || null,
        priority: goal?.priority ?? 1,
        account_id: accountId ? Number(accountId) : null,
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
          <h3 className="text-lg font-semibold">{goal ? 'Editar meta de ahorro' : 'Nueva meta de ahorro'}</h3>
          <button onClick={onClose} style={{ color: '#6B6B85' }}><X size={20} /></button>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#A0A0B8' }}>Nombre</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej. Fondo de emergencia, Viaje, Computadora…"
              className="w-full px-4 py-3 rounded-xl text-sm"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#A0A0B8' }}>Meta ($)</label>
              <input
                value={targetAmount}
                onChange={e => setTargetAmount(e.target.value)}
                type="number"
                step="0.01"
                min="0"
                className="w-full px-4 py-3 rounded-xl text-sm font-mono"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#A0A0B8' }}>Ahorrado ($)</label>
              <input
                value={currentAmount}
                onChange={e => setCurrentAmount(e.target.value)}
                type="number"
                step="0.01"
                min="0"
                className="w-full px-4 py-3 rounded-xl text-sm font-mono"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#A0A0B8' }}>Cuenta de destino (donde vive el ahorro)</label>
            <select
              value={accountId}
              onChange={e => setAccountId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm"
              style={{ background: 'rgba(26,26,46,0.9)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
            >
              <option value="">Sin cuenta asignada</option>
              {accounts.filter(a => a.type !== 'credit').map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            <p className="text-xs mt-1" style={{ color: '#6B6B85' }}>
              Al abonar desde otra cuenta, el dinero se transfiere aquí.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#A0A0B8' }}>Fecha objetivo (opcional)</label>
            <input
              value={targetDate}
              onChange={e => setTargetDate(e.target.value)}
              type="date"
              className="w-full px-4 py-3 rounded-xl text-sm"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
            />
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