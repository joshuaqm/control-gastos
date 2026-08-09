import { useState } from 'react'
import { Download, Filter, Plus } from 'lucide-react'
import TransactionRow from '@/components/transactions/TransactionRow'
import AddTransactionModal from '@/components/transactions/AddTransactionModal'
import { transactions } from '@/data/mockData'
import type { ShowToast } from '@/types'

type TxFilter = 'all' | 'income' | 'expense'

const filterLabels: Record<TxFilter, string> = {
  all: 'Todos',
  income: 'Ingresos',
  expense: 'Gastos',
}

export default function TransactionsScreen({ showToast }: { showToast: ShowToast }) {
  const [addOpen, setAddOpen] = useState(false)
  const [filter, setFilter] = useState<TxFilter>('all')
  const filtered = filter === 'all' ? transactions : transactions.filter(t => t.type === filter)

  return (
    <div className="flex flex-col gap-5 pb-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Transacciones</h2>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium" style={{ background: 'rgba(255,255,255,0.06)', color: '#A0A0B8' }}>
            <Filter size={14} /> Filtrar
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium" style={{ background: 'rgba(255,255,255,0.06)', color: '#A0A0B8' }}>
            <Download size={14} /> CSV
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        {(['all', 'income', 'expense'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-4 py-2 rounded-xl text-xs font-medium transition-all"
            style={filter === f ? { background: 'linear-gradient(135deg,#7C3AED,#5B21B6)', color: '#fff' } : { background: 'rgba(255,255,255,0.06)', color: '#A0A0B8' }}
          >
            {filterLabels[f]}
          </button>
        ))}
      </div>

      <div className="glass rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="hidden sm:grid grid-cols-5 px-5 py-3 text-xs font-medium" style={{ color: '#6B6B85', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <span>Fecha</span><span>Descripción</span><span>Categoría</span><span>Cuenta</span><span className="text-right">Monto</span>
        </div>
        {filtered.map(t => (
          <TransactionRow key={t.id} transaction={t} table />
        ))}
      </div>

      <button
        onClick={() => setAddOpen(true)}
        className="btn-primary fixed bottom-20 sm:bottom-6 right-6 w-14 h-14 rounded-2xl flex items-center justify-center z-30 animate-pulse-glow"
      >
        <Plus size={24} color="white" />
      </button>
      <AddTransactionModal open={addOpen} onClose={() => setAddOpen(false)} onAdd={() => showToast('Movimiento registrado', 'success')} />
    </div>
  )
}