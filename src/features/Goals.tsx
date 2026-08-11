import { useEffect, useState } from 'react'
import { Clock, Landmark, Pencil, Plus, Trash2, Wallet } from 'lucide-react'
import GoalFormModal from '@/components/goals/GoalFormModal'
import DepositModal from '@/components/goals/DepositModal'
import { createGoal, deleteGoal, depositGoal, fetchGoals, updateGoal, type ApiGoal } from '@/api/goals'
import { fetchAccounts, type ApiAccount } from '@/api/accounts'
import { fmt } from '@/utils/format'
import type { ShowToast } from '@/types'

const GOAL_COLORS = ['#7C3AED', '#06D6A0', '#F59E0B', '#3B82F6', '#EC4899', '#8B5CF6']

const goalColor = (g: ApiGoal) => GOAL_COLORS[g.id % GOAL_COLORS.length]

const fmtShortDate = (d: string | null) => {
  if (!d) return null
  const dt = new Date(`${String(d).slice(0, 10)}T00:00:00`)
  if (Number.isNaN(dt.getTime())) return null
  return dt.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}

const daysUntil = (d: string | null) => {
  if (!d) return null
  const dt = new Date(`${String(d).slice(0, 10)}T00:00:00`)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.round((dt.getTime() - now.getTime()) / 86400000)
}

export default function GoalsScreen({ showToast }: { showToast: ShowToast }) {
  const [goals, setGoals] = useState<ApiGoal[]>([])
  const [accounts, setAccounts] = useState<ApiAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ApiGoal | null>(null)
  const [depositTarget, setDepositTarget] = useState<ApiGoal | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [g, a] = await Promise.all([fetchGoals(), fetchAccounts()])
      setGoals(g)
      setAccounts(a)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al cargar metas', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const accountName = (id: number | null) =>
    id == null ? null : (accounts.find(a => a.id === id)?.name ?? null)

  const totalSaved = goals.reduce((s, g) => s + Number(g.current_amount), 0)
  const totalTarget = goals.reduce((s, g) => s + Number(g.target_amount), 0)
  const completed = goals.filter(g => Number(g.current_amount) >= Number(g.target_amount)).length

  const openCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (g: ApiGoal) => {
    setEditing(g)
    setModalOpen(true)
  }

  const handleSave = async (data: Parameters<typeof createGoal>[0]) => {
    try {
      if (editing) {
        await updateGoal(editing.id, data)
        showToast('Meta actualizada', 'success')
      } else {
        await createGoal(data)
        showToast('Meta creada', 'success')
      }
      setModalOpen(false)
      await load()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al guardar', 'error')
    }
  }

  const handleDelete = async (g: ApiGoal) => {
    if (!window.confirm(`¿Eliminar la meta "${g.name}"?`)) return
    try {
      await deleteGoal(g.id)
      showToast('Meta eliminada', 'success')
      await load()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al eliminar', 'error')
    }
  }

  const handleDeposit = async (data: { amount: number; account_id: number | null; date: string }) => {
    if (!depositTarget) return
    try {
      await depositGoal(depositTarget.id, data)
      showToast(`Abonado ${fmt(data.amount)} a "${depositTarget.name}"`, 'success')
      setDepositTarget(null)
      await load()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al abonar', 'error')
    }
  }

  return (
    <div className="flex flex-col gap-5 pb-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Metas de Ahorro</h2>
        <button
          onClick={openCreate}
          className="btn-primary flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
        >
          <Plus size={16} /> Nueva
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-5" style={{ border: '1px solid rgba(124,58,237,0.2)' }}>
          <p className="text-sm" style={{ color: '#A0A0B8' }}>Ahorrado en total</p>
          <p className="text-3xl font-bold font-mono mt-1" style={{ color: '#A78BFA' }}>{fmt(totalSaved)}</p>
          <p className="text-xs mt-2" style={{ color: '#6B6B85' }}>de {fmt(totalTarget)} de metas</p>
        </div>
        <div className="glass rounded-2xl p-5" style={{ border: '1px solid rgba(6,214,160,0.2)' }}>
          <p className="text-sm" style={{ color: '#A0A0B8' }}>Metas completadas</p>
          <p className="text-3xl font-bold font-mono mt-1" style={{ color: '#06D6A0' }}>{completed}/{goals.length || 0}</p>
          <p className="text-xs mt-2" style={{ color: '#6B6B85' }}>{(goals.length > 0) ? `${Math.round((completed / goals.length) * 100)}% de avance` : 'Sin metas aún'}</p>
        </div>
      </div>

      {loading ? (
        <div className="py-16 flex justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-purple-600 animate-spin" />
        </div>
      ) : goals.length === 0 ? (
        <div className="py-16 text-center text-sm rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', color: '#6B6B85' }}>
          No hay metas de ahorro. Crea una con el botón "Nueva".
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map(g => {
            const current = Number(g.current_amount)
            const target = Number(g.target_amount)
            const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
            const done = current >= target
            const r = 28
            const circ = 2 * Math.PI * r
            const color = goalColor(g)
            const days = daysUntil(g.target_date)
            return (
              <div key={g.id} className="glass card-hover rounded-2xl p-5 flex flex-col items-center gap-2" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                <svg width={76} height={76} className="-rotate-90">
                  <circle cx={38} cy={38} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={7} />
                  <circle
                    cx={38} cy={38} r={r} fill="none" stroke={done ? '#06D6A0' : color} strokeWidth={7}
                    strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)} strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                  />
                </svg>
                <div className="text-center -mt-1">
                  <p className="text-xl font-bold font-mono" style={{ color: done ? '#06D6A0' : color }}>{pct}%</p>
                  <p className="text-sm font-semibold mt-0.5">{g.name}</p>
                  <p className="text-xs mt-0.5 font-mono" style={{ color: '#A0A0B8' }}>{fmt(current)} <span style={{ color: '#6B6B85' }}>/ {fmt(target)}</span></p>
                </div>

                <div className="w-full h-1.5 rounded-full overflow-hidden mt-1" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: done ? '#06D6A0' : color }} />
                </div>

                <div className="flex items-center justify-between w-full mt-2 text-[11px]" style={{ color: '#6B6B85' }}>
                  <span className="flex items-center gap-1"><Clock size={11} /> {fmtShortDate(g.target_date) ?? 'Sin plazo'}</span>
                  {days !== null && days >= 0 && <span>{days === 0 ? 'vence hoy' : `${days} días`}</span>}
                </div>

                {accountName(g.account_id) && (
                  <p className="text-[11px] w-full flex items-center gap-1" style={{ color: '#A0A0B8' }}>
                    <Landmark size={11} /> Guardado en: {accountName(g.account_id)}
                  </p>
                )}

                {g.notes && (
                  <p className="text-[11px] w-full" style={{ color: '#6B6B85' }}>{g.notes}</p>
                )}

                <div className="flex items-center gap-2 mt-2 w-full">
                  <button
                    onClick={() => setDepositTarget(g)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{ background: 'rgba(124,58,237,0.15)', color: '#A78BFA' }}
                  >
                    <Wallet size={13} /> Abonar
                  </button>
                  <button onClick={() => openEdit(g)} className="p-2 rounded-lg hover:bg-white/10" style={{ color: '#A0A0B8' }}>
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => handleDelete(g)} className="p-2 rounded-lg hover:bg-white/10" style={{ color: '#F87171' }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <GoalFormModal
        key={editing?.id ?? 'new'}
        open={modalOpen}
        goal={editing}
        accounts={accounts}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />

      <DepositModal
        key={`dep-${depositTarget?.id ?? 'none'}`}
        open={depositTarget !== null}
        goal={depositTarget}
        accounts={accounts}
        onClose={() => setDepositTarget(null)}
        onSubmit={handleDeposit}
      />

      <button
        onClick={openCreate}
        className="btn-primary fixed bottom-20 sm:bottom-6 right-6 w-14 h-14 rounded-2xl flex items-center justify-center z-30 animate-pulse-glow sm:hidden"
      >
        <Plus size={24} color="white" />
      </button>
    </div>
  )
}