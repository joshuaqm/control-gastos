import { useState } from 'react'
import { X } from 'lucide-react'
import type { ApiDebt } from '@/api/debts'

export interface DebtFormData {
  name: string
  creditor: string
  type: string
  original_amount: number
  interest_rate?: number | null
  account_id?: number | null
  start_date: string
  due_date?: string | null
  status?: string
  notes?: string | null
}

const DEBT_TYPES = [
  { value: 'personal', label: 'Personal' },
  { value: 'auto', label: 'Auto' },
  { value: 'mortgage', label: 'Hipoteca' },
  { value: 'student', label: 'Estudiantil' },
  { value: 'other', label: 'Otro' },
] as const

export default function DebtFormModal({
  open,
  debt,
  onClose,
  onSave,
}: {
  open: boolean
  debt: ApiDebt | null
  onClose: () => void
  onSave: (data: DebtFormData) => Promise<void>
}) {
  const [name, setName] = useState(debt?.name ?? '')
  const [creditor, setCreditor] = useState(debt?.creditor ?? '')
  const [type, setType] = useState(debt?.type ?? 'personal')
  const [originalAmount, setOriginalAmount] = useState(debt ? debt.original_amount.toString() : '')
  const [interestRate, setInterestRate] = useState(debt?.interest_rate != null ? debt.interest_rate.toString() : '')
  const [startDate, setStartDate] = useState(debt?.start_date?.slice(0, 10) ?? '')
  const [dueDate, setDueDate] = useState(debt?.due_date?.slice(0, 10) ?? '')
  const [notes, setNotes] = useState(debt?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  if (!open) return null

  const handleSave = async () => {
    if (!name.trim()) {
      setError('El nombre es obligatorio')
      return
    }
    if (!Number.isFinite(Number(originalAmount)) || Number(originalAmount) <= 0) {
      setError('Ingresa un monto válido')
      return
    }
    if (!startDate) {
      setError('La fecha de inicio es obligatoria')
      return
    }

    setSaving(true)
    setError('')
    try {
      await onSave({
        name: name.trim(),
        creditor: creditor.trim() || '—',
        type,
        original_amount: Number(originalAmount),
        interest_rate: interestRate ? Number(interestRate) : null,
        start_date: startDate,
        due_date: dueDate || null,
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
          <h3 className="text-lg font-semibold">{debt ? 'Editar deuda' : 'Nueva deuda'}</h3>
          <button onClick={onClose} style={{ color: '#6B6B85' }}><X size={20} /></button>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#A0A0B8' }}>Nombre</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej. Préstamo personal"
              className="w-full px-4 py-3 rounded-xl text-sm"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#A0A0B8' }}>Acreedor</label>
              <input
                value={creditor}
                onChange={e => setCreditor(e.target.value)}
                placeholder="Banco"
                className="w-full px-4 py-3 rounded-xl text-sm"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#A0A0B8' }}>Tipo</label>
              <select
                value={type}
                onChange={e => setType(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm"
                style={{ background: 'rgba(26,26,46,0.9)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              >
                {DEBT_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#A0A0B8' }}>Monto original</label>
              <input
                value={originalAmount}
                onChange={e => setOriginalAmount(e.target.value)}
                type="number"
                step="0.01"
                min="0"
                className="w-full px-4 py-3 rounded-xl text-sm font-mono"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              />
            </div>
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
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#A0A0B8' }}>Fecha inicio</label>
              <input
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                type="date"
                className="w-full px-4 py-3 rounded-xl text-sm"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#A0A0B8' }}>Fecha vencimiento</label>
              <input
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                type="date"
                className="w-full px-4 py-3 rounded-xl text-sm"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              />
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