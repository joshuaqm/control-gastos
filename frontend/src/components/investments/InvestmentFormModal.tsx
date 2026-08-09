import { useState } from 'react'
import { X } from 'lucide-react'
import type { ApiInvestment } from '@/api/investments'

export interface InvestmentFormData {
  name: string
  ticker?: string | null
  broker?: string | null
  type: string
  units: number
  average_cost: number
  current_price?: number | null
  purchase_date?: string | null
  last_updated?: string | null
  notes?: string | null
}

const INVESTMENT_TYPES = [
  { value: 'etf', label: 'ETF / Fondo' },
  { value: 'stock', label: 'Acción' },
  { value: 'crypto', label: 'Cripto' },
  { value: 'fixed_income', label: 'Renta fija' },
  { value: 'other', label: 'Otro' },
] as const

export default function InvestmentFormModal({
  open,
  investment,
  onClose,
  onSave,
}: {
  open: boolean
  investment: ApiInvestment | null
  onClose: () => void
  onSave: (data: InvestmentFormData) => Promise<void>
}) {
  const [name, setName] = useState(investment?.name ?? '')
  const [ticker, setTicker] = useState(investment?.ticker ?? '')
  const [broker, setBroker] = useState(investment?.broker ?? '')
  const [type, setType] = useState(investment?.type ?? 'etf')
  const [units, setUnits] = useState(investment ? investment.units.toString() : '')
  const [averageCost, setAverageCost] = useState(investment ? investment.average_cost.toString() : '')
  const [currentPrice, setCurrentPrice] = useState(investment?.current_price != null ? investment.current_price.toString() : '')
  const [purchaseDate, setPurchaseDate] = useState(investment?.purchase_date?.slice(0, 10) ?? '')
  const [lastUpdated, setLastUpdated] = useState(investment?.last_updated?.slice(0, 10) ?? '')
  const [notes, setNotes] = useState(investment?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  if (!open) return null

  const handleSave = async () => {
    if (!name.trim()) {
      setError('El nombre es obligatorio')
      return
    }
    if (!Number.isFinite(Number(units)) || Number(units) <= 0) {
      setError('Ingresa un número de unidades válido')
      return
    }
    if (!Number.isFinite(Number(averageCost)) || Number(averageCost) < 0) {
      setError('Ingresa un costo promedio válido')
      return
    }

    setSaving(true)
    setError('')
    try {
      await onSave({
        name: name.trim(),
        ticker: ticker.trim() || null,
        broker: broker.trim() || null,
        type,
        units: Number(units),
        average_cost: Number(averageCost),
        current_price: currentPrice ? Number(currentPrice) : null,
        purchase_date: purchaseDate || null,
        last_updated: lastUpdated || null,
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
          <h3 className="text-lg font-semibold">{investment ? 'Editar Inversión' : 'Registrar Inversión'}</h3>
          <button onClick={onClose} style={{ color: '#6B6B85' }}><X size={20} /></button>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#A0A0B8' }}>Nombre</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej. S&P 500 ETF"
              className="w-full px-4 py-3 rounded-xl text-sm"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#A0A0B8' }}>Ticker</label>
              <input
                value={ticker}
                onChange={e => setTicker(e.target.value)}
                placeholder="Ej. VOO"
                className="w-full px-4 py-3 rounded-xl text-sm font-mono uppercase"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#A0A0B8' }}>Casa de bolsa</label>
              <input
                value={broker}
                onChange={e => setBroker(e.target.value)}
                placeholder="Ej. GBM"
                className="w-full px-4 py-3 rounded-xl text-sm"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#A0A0B8' }}>Tipo</label>
            <select
              value={type}
              onChange={e => setType(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm"
              style={{ background: 'rgba(26,26,46,0.9)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
            >
              {INVESTMENT_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#A0A0B8' }}>Unidades</label>
              <input
                value={units}
                onChange={e => setUnits(e.target.value)}
                type="number"
                step="any"
                min="0"
                className="w-full px-4 py-3 rounded-xl text-sm font-mono"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#A0A0B8' }}>Costo de adquisición (c/u)</label>
              <input
                value={averageCost}
                onChange={e => setAverageCost(e.target.value)}
                type="number"
                step="0.01"
                min="0"
                className="w-full px-4 py-3 rounded-xl text-sm font-mono"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#A0A0B8' }}>Precio actual (opcional)</label>
              <input
                value={currentPrice}
                onChange={e => setCurrentPrice(e.target.value)}
                type="number"
                step="0.01"
                min="0"
                placeholder="Opcional"
                className="w-full px-4 py-3 rounded-xl text-sm font-mono"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#A0A0B8' }}>Fecha de compra</label>
              <input
                value={purchaseDate}
                onChange={e => setPurchaseDate(e.target.value)}
                type="date"
                className="w-full px-4 py-3 rounded-xl text-sm"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#A0A0B8' }}>Última actualización</label>
              <input
                value={lastUpdated}
                onChange={e => setLastUpdated(e.target.value)}
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