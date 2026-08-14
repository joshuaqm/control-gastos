import { useState } from 'react'
import { X } from 'lucide-react'
import type { ApiAccount } from '@/api/accounts'
import { fmt, fmtSigned } from '@/utils/format'

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function InterestAdjustModal({
  open,
  account,
  currentBalance,
  onClose,
  onSubmit,
}: {
  open: boolean
  account: ApiAccount | null
  currentBalance: number
  onClose: () => void
  onSubmit: (data: { amount: number; month: string }) => Promise<void>
}) {
  const [newBalance, setNewBalance] = useState('')
  const [month, setMonth] = useState(today().slice(0, 7))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  if (!open) return null

  const parsed = Number(newBalance)
  const validBalance = newBalance !== '' && Number.isFinite(parsed) && parsed >= 0
  const diff = validBalance
    ? Math.round((parsed - currentBalance) * 100) / 100
    : null

  const handleSave = async () => {
    if (!validBalance) {
      setError('Ingresa un saldo válido')
      return
    }
    if (diff == null || diff <= 0) {
      setError(
        'El saldo actualizado debe ser mayor al saldo actual para registrar un rendimiento',
      )
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSubmit({ amount: diff, month: `${month}-01` })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
      <div className="glass animate-slide-up rounded-2xl p-6 w-full max-w-md" style={{ border: '1px solid rgba(124,58,237,0.2)' }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold">Ajustar rendimiento real</h3>
          <button onClick={onClose} style={{ color: '#6B6B85' }}><X size={20} /></button>
        </div>

        <p className="text-xs mb-4 px-3 py-2 rounded-lg" style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.25)', color: '#C4B5FD' }}>
          {account?.name ?? ''} · tasa {account?.interest_rate ?? 0}%. Ingresa el
          saldo actualizado de la cuenta y la app calculará el rendimiento del mes.
        </p>

        <div className="flex flex-col gap-3">
          <div className="px-3 py-2 rounded-lg text-sm flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <span style={{ color: '#6B6B85' }}>Saldo actual</span>
            <span className="font-mono font-semibold" style={{ color: '#fff' }}>{fmt(currentBalance)}</span>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#A0A0B8' }}>
              Saldo actualizado
            </label>
            <input
              value={newBalance}
              onChange={e => setNewBalance(e.target.value)}
              type="number"
              step="0.01"
              min="0"
              autoFocus
              placeholder="Ej. 12045.30"
              className="w-full px-4 py-3 rounded-xl text-sm font-mono"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
            />
          </div>
          <div className="px-3 py-2 rounded-lg text-sm flex items-center justify-between" style={{ background: 'rgba(6,214,160,0.08)', border: '1px solid rgba(6,214,160,0.15)' }}>
            <span style={{ color: '#6B6B85' }}>Rendimiento total del mes</span>
            <span className="font-mono font-semibold" style={{ color: diff != null && diff > 0 ? '#34D399' : '#F87171' }}>
              {diff != null ? fmtSigned(diff) : '—'}
            </span>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#A0A0B8' }}>Mes del rendimiento</label>
            <input
              value={month}
              onChange={e => setMonth(e.target.value)}
              type="month"
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
              'Guardar ajuste'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}