import { budgetCategories, subBudgets } from '@/data/mockData'
import { fmt } from '@/utils/format'

export default function BudgetsScreen() {
  return (
    <div className="flex flex-col gap-5 pb-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Presupuestos</h2>
      </div>

      <div className="glass rounded-2xl p-5" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
        <h3 className="text-base font-semibold mb-1">Regla 50/30/20</h3>
        <p className="text-xs mb-4" style={{ color: '#6B6B85' }}>Basado en ingresos mensuales de {fmt(5200)}</p>
        {budgetCategories.map(b => (
          <div key={b.name} className="mb-4 last:mb-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{b.icon}</span>
                <div>
                  <p className="text-sm font-semibold">{b.name}</p>
                  <p className="text-xs" style={{ color: '#6B6B85' }}>{b.pct}% del ingreso</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-mono font-bold">{fmt(b.spent)}</p>
                <p className="text-xs" style={{ color: '#6B6B85' }}>de {fmt(b.budget)}</p>
              </div>
            </div>
            <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${(b.spent / b.budget) * 100}%`, background: b.color }} />
            </div>
            <div className="flex justify-between mt-1 text-xs">
              <span style={{ color: '#6B6B85' }}>Restante: {fmt(b.budget - b.spent)}</span>
              <span style={{ color: b.color }}>{Math.round((b.spent / b.budget) * 100)}%</span>
            </div>
          </div>
        ))}
      </div>

      <div className="glass rounded-2xl p-5" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
        <h3 className="text-base font-semibold mb-4">Por Categoría</h3>
        <div className="flex flex-col gap-3">
          {subBudgets.map(b => {
            const Icon = b.icon
            const pct = Math.round((b.spent / b.budgeted) * 100)
            const over = pct > 100
            return (
              <div key={b.name} className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${b.color}22` }}>
                  <Icon size={16} style={{ color: b.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between mb-1 text-sm">
                    <span className="font-medium">{b.name}</span>
                    <div>
                      <span className="font-mono font-semibold" style={{ color: over ? '#EF4444' : '#fff' }}>{fmt(b.spent)}</span>
                      <span className="text-xs ml-1" style={{ color: '#6B6B85' }}>/ {fmt(b.budgeted)}</span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: over ? '#EF4444' : b.color }} />
                  </div>
                </div>
                <span className="text-xs font-mono w-10 text-right" style={{ color: over ? '#EF4444' : '#A0A0B8' }}>{pct}%</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}