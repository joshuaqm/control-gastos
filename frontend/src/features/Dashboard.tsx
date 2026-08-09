import { useState } from 'react'
import { Banknote, CreditCard, Plus, TrendingUp, Wallet } from 'lucide-react'
import AIPrompt from '@/components/ai/AIPrompt'
import AddTransactionModal from '@/components/transactions/AddTransactionModal'
import TransactionRow from '@/components/transactions/TransactionRow'
import SummaryCard from '@/components/ui/SummaryCard'
import SavingsGoalCard from '@/components/ui/SavingsGoalCard'
import AreaEvolutionChart from '@/components/charts/AreaEvolutionChart'
import AssetsDonutChart from '@/components/charts/AssetsDonutChart'
import CashFlowBarChart from '@/components/charts/CashFlowBarChart'
import CategoryDonutChart from '@/components/charts/CategoryDonutChart'
import { budgetCategories, patrimonialData, savingsGoals, transactions } from '@/data/mockData'
import { fmt } from '@/utils/format'
import type { ShowToast } from '@/types'

export default function Dashboard({ onOpenChat, showToast }: {
  onOpenChat: (msg?: string) => void
  showToast: ShowToast
}) {
  const [addOpen, setAddOpen] = useState(false)

  return (
    <div className="flex flex-col gap-6 pb-6">
      <AIPrompt onOpenChat={onOpenChat} />

      <div className="summary-cards grid gap-4">
        <SummaryCard title="Patrimonio Neto" value={fmt(54720)} sub="Activos menos pasivos" trend={6.8} icon={Wallet} color="#7C3AED" />
        <SummaryCard title="Liquidez" value={fmt(19400)} sub="Cuentas débito + efectivo" trend={-2.1} icon={Banknote} color="#06D6A0" />
        <SummaryCard title="Deudas" value={fmt(133900)} sub="Total pendiente" trend={-3.4} icon={CreditCard} color="#EF4444" />
        <SummaryCard title="Inversiones" value={fmt(22100)} sub="+3.2% rendimiento" trend={3.2} icon={TrendingUp} color="#F59E0B" />
      </div>

      <div className="glass rounded-2xl p-5" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold">Presupuesto del Mes</h3>
          <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ background: 'rgba(124,58,237,0.15)', color: '#A78BFA' }}>Agosto 2026</span>
        </div>
        <div className="flex flex-col gap-4">
          {budgetCategories.map(b => (
            <div key={b.name}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span>{b.icon}</span>
                  <span className="text-sm font-medium">{b.name}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded font-mono" style={{ background: 'rgba(255,255,255,0.06)', color: '#6B6B85' }}>{b.pct}%</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-mono font-semibold">{fmt(b.spent)}</span>
                  <span className="text-xs ml-1" style={{ color: '#6B6B85' }}>/ {fmt(b.budget)}</span>
                </div>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div
                  className="h-full rounded-full progress-bar transition-all"
                  style={{ width: `${(b.spent / b.budget) * 100}%`, background: b.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="charts-grid grid gap-4">
        <div className="glass rounded-2xl p-5" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
          <h3 className="text-sm font-semibold mb-4">Gastos por Categoría</h3>
          <CategoryDonutChart />
        </div>
        <div className="glass rounded-2xl p-5" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
          <h3 className="text-sm font-semibold mb-4">Evolución Patrimonial</h3>
          <AreaEvolutionChart data={patrimonialData} color="#7C3AED" name="Patrimonio" />
        </div>
        <div className="glass rounded-2xl p-5" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
          <h3 className="text-sm font-semibold mb-4">Cash Flow Mensual</h3>
          <CashFlowBarChart />
        </div>
        <div className="glass rounded-2xl p-5" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
          <h3 className="text-sm font-semibold mb-4">Distribución de Activos</h3>
          <AssetsDonutChart />
        </div>
      </div>

      <div className="glass rounded-2xl p-5" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold">Transacciones Recientes</h3>
          <span className="text-xs" style={{ color: '#7C3AED', cursor: 'pointer' }}>Ver todas →</span>
        </div>
        <div className="flex flex-col gap-2">
          {transactions.slice(0, 5).map(t => (
            <TransactionRow key={t.id} transaction={t} />
          ))}
        </div>
      </div>

      <div className="glass rounded-2xl p-5" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold">Metas de Ahorro</h3>
          <button className="text-xs px-3 py-1 rounded-lg" style={{ background: 'rgba(124,58,237,0.15)', color: '#A78BFA' }}>+ Nueva</button>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {savingsGoals.map(g => (
            <SavingsGoalCard key={g.name} goal={g} />
          ))}
        </div>
      </div>

      <button
        onClick={() => setAddOpen(true)}
        className="btn-primary fixed bottom-20 sm:bottom-6 right-6 w-14 h-14 rounded-2xl flex items-center justify-center z-30 animate-pulse-glow"
      >
        <Plus size={24} color="white" />
      </button>

      <AddTransactionModal open={addOpen} onClose={() => setAddOpen(false)} onAdd={() => showToast('Movimiento registrado exitosamente', 'success')} />
    </div>
  )
}