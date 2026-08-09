import { ArrowDownRight, ArrowUpRight, Plus } from 'lucide-react'
import { accounts } from '@/data/mockData'
import { fmt } from '@/utils/format'
import type { ShowToast } from '@/types'

export default function AccountsScreen({ showToast }: { showToast: ShowToast }) {
  return (
    <div className="flex flex-col gap-5 pb-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Cuentas</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {accounts.map(a => {
          const Icon = a.icon
          const isCredit = a.type === 'Crédito'
          const up = !isCredit && a.prev && a.balance > a.prev
          return (
            <div key={a.id} className="glass card-hover rounded-2xl p-5 relative overflow-hidden cursor-pointer" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="absolute -bottom-8 -right-8 w-32 h-32 rounded-full opacity-10" style={{ background: a.color }} />
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${a.color}22` }}>
                    <Icon size={20} style={{ color: a.color }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{a.name}</p>
                    <p className="text-xs" style={{ color: '#6B6B85' }}>{a.type}</p>
                  </div>
                </div>
                <span className="text-xs px-2 py-1 rounded-full" style={{ background: `${a.color}22`, color: a.color }}>{a.type}</span>
              </div>
              <p className="text-3xl font-bold font-mono" style={{ color: isCredit ? '#EF4444' : '#fff' }}>
                {isCredit ? '-' : ''}{fmt(Math.abs(a.balance))}
              </p>
              {isCredit ? (
                <div className="mt-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color: '#6B6B85' }}>Disponible</span>
                    <span style={{ color: '#A0A0B8' }}>{fmt((a.limit || 0) + a.balance)} / {fmt(a.limit || 0)}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                    <div className="h-full rounded-full" style={{ width: `${(Math.abs(a.balance) / (a.limit || 1)) * 100}%`, background: '#EF4444' }} />
                  </div>
                  <p className="text-xs mt-2" style={{ color: '#6B6B85' }}>Corte: {a.dueDate}</p>
                </div>
              ) : a.prev ? (
                <div className="flex items-center gap-1 mt-2 text-xs">
                  {up ? <ArrowUpRight size={12} style={{ color: '#06D6A0' }} /> : <ArrowDownRight size={12} style={{ color: '#EF4444' }} />}
                  <span style={{ color: up ? '#06D6A0' : '#EF4444' }}>{fmt(Math.abs(a.balance - (a.prev || 0)))} vs mes anterior</span>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
      <button
        onClick={() => showToast('Función próximamente disponible', 'info')}
        className="btn-primary fixed bottom-20 sm:bottom-6 right-6 w-14 h-14 rounded-2xl flex items-center justify-center z-30 animate-pulse-glow"
      >
        <Plus size={24} color="white" />
      </button>
    </div>
  )
}