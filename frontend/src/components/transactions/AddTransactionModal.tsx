import { useState } from 'react'
import { X } from 'lucide-react'
import { accounts } from '@/data/mockData'

const CATEGORIES = ['Comida', 'Transporte', 'Vivienda', 'Salud', 'Entretenimiento', 'Servicios', 'Compras', 'Otros']

export default function AddTransactionModal({ open, onClose, onAdd }: {
  open: boolean
  onClose: () => void
  onAdd: () => void
}) {
  const [desc, setDesc] = useState('')
  const [amount, setAmount] = useState('')
  const [type, setType] = useState<'expense' | 'income'>('expense')
  const [cat, setCat] = useState('Comida')

  const handleSave = () => {
    if (!desc || !amount) return
    onAdd()
    onClose()
    setDesc(''); setAmount('')
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
      <div className="glass animate-slide-up rounded-2xl p-6 w-full max-w-md" style={{ border: '1px solid rgba(124,58,237,0.2)' }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold">Registrar Movimiento</h3>
          <button onClick={onClose} style={{ color: '#6B6B85' }}><X size={20} /></button>
        </div>

        <div className="flex rounded-xl p-1 mb-4" style={{ background: 'rgba(255,255,255,0.05)' }}>
          {(['expense', 'income'] as const).map(t => (
            <button
              key={t}
              onClick={() => setType(t)}
              className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
              style={type === t ? { background: t === 'expense' ? '#EF4444' : '#06D6A0', color: '#fff' } : { color: '#A0A0B8' }}
            >
              {t === 'expense' ? '↑ Gasto' : '↓ Ingreso'}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <input
            value={desc}
            onChange={e => setDesc(e.target.value)}
            placeholder="Descripción"
            className="w-full px-4 py-3 rounded-xl text-sm"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
          />
          <input
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="Monto $0.00"
            type="number"
            className="w-full px-4 py-3 rounded-xl text-sm font-mono"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
          />
          <select
            value={cat}
            onChange={e => setCat(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-sm"
            style={{ background: 'rgba(26,26,46,0.9)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
          >
            {CATEGORIES.map(c => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select
            className="w-full px-4 py-3 rounded-xl text-sm"
            style={{ background: 'rgba(26,26,46,0.9)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
          >
            {accounts.map(a => <option key={a.id}>{a.name}</option>)}
          </select>
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-medium" style={{ background: 'rgba(255,255,255,0.06)', color: '#A0A0B8' }}>
            Cancelar
          </button>
          <button onClick={handleSave} className="btn-primary flex-1 py-3 rounded-xl text-sm font-semibold">
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}