import { ArrowDownRight, ArrowUpRight, Plus } from 'lucide-react'
import AreaEvolutionChart from '@/components/charts/AreaEvolutionChart'
import { investments, patrimonialData } from '@/data/mockData'
import { fmt } from '@/utils/format'
import type { ShowToast } from '@/types'

export default function InvestmentsScreen({ showToast }: { showToast: ShowToast }) {
  const totalValue = investments.reduce((s, i) => s + i.price * i.qty, 0)
  const totalPrev = investments.reduce((s, i) => s + i.prevPrice * i.qty, 0)
  const totalGain = totalValue - totalPrev
  const gainPct = ((totalGain / totalPrev) * 100).toFixed(2)

  return (
    <div className="flex flex-col gap-5 pb-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Inversiones</h2>
        <button
          onClick={() => showToast('Inversión agregada', 'success')}
          className="btn-primary flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
        >
          <Plus size={16} /> Agregar
        </button>
      </div>

      <div className="glass rounded-2xl p-5" style={{ border: '1px solid rgba(6,214,160,0.2)' }}>
        <p className="text-sm" style={{ color: '#A0A0B8' }}>Valor del Portafolio</p>
        <p className="text-4xl font-bold font-mono mt-1">{fmt(totalValue)}</p>
        <div className="flex items-center gap-2 mt-2">
          {totalGain >= 0
            ? <ArrowUpRight size={16} style={{ color: '#06D6A0' }} />
            : <ArrowDownRight size={16} style={{ color: '#EF4444' }} />}
          <span className="text-sm font-semibold" style={{ color: totalGain >= 0 ? '#06D6A0' : '#EF4444' }}>
            {totalGain >= 0 ? '+' : ''}{fmt(totalGain)} ({gainPct}%)
          </span>
          <span className="text-xs" style={{ color: '#6B6B85' }}>vs precio anterior</span>
        </div>
      </div>

      <div className="glass rounded-2xl p-5" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
        <h3 className="text-sm font-semibold mb-4">Evolución del Portafolio</h3>
        <AreaEvolutionChart data={patrimonialData} color="#06D6A0" name="Portafolio" height={180} />
      </div>

      <div className="flex flex-col gap-3">
        {investments.map(inv => {
          const value = inv.price * inv.qty
          const gain = (inv.price - inv.prevPrice) * inv.qty
          const gainPctI = (((inv.price - inv.prevPrice) / inv.prevPrice) * 100).toFixed(2)
          const isUp = gain >= 0
          return (
            <div key={inv.id} className="glass card-hover rounded-2xl p-4" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs" style={{ background: `${inv.color}22`, color: inv.color }}>
                    {inv.ticker}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{inv.name}</p>
                    <p className="text-xs" style={{ color: '#6B6B85' }}>{inv.qty} unidades · {fmt(inv.price)} c/u</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-base font-bold font-mono">{fmt(value)}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full font-mono" style={{
                    background: isUp ? 'rgba(6,214,160,0.15)' : 'rgba(239,68,68,0.15)',
                    color: isUp ? '#06D6A0' : '#EF4444',
                  }}>
                    {isUp ? '+' : ''}{gainPctI}%
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}