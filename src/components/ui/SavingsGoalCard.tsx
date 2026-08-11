import type { SavingsGoal } from '@/types'
import { fmt } from '@/utils/format'

export default function SavingsGoalCard({ goal }: { goal: SavingsGoal }) {
  const pct = Math.round((goal.current / goal.goal) * 100)
  const r = 28
  const circ = 2 * Math.PI * r
  return (
    <div className="flex flex-col items-center gap-2 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
      <svg width={70} height={70} className="-rotate-90">
        <circle cx={35} cy={35} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={6} />
        <circle
          cx={35} cy={35} r={r} fill="none" stroke={goal.color} strokeWidth={6}
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)} strokeLinecap="round"
        />
      </svg>
      <div className="text-center -mt-2">
        <p className="text-lg font-bold font-mono" style={{ color: goal.color }}>{pct}%</p>
        <p className="text-xs font-medium">{goal.name}</p>
        <p className="text-xs mt-0.5" style={{ color: '#6B6B85' }}>{fmt(goal.current)} / {fmt(goal.goal)}</p>
      </div>
    </div>
  )
}