import { ChevronDown, ChevronUp, type LucideIcon } from 'lucide-react'

export default function SummaryCard({ title, value, sub, trend, icon: Icon, color }: {
  title: string
  value: string
  sub: string
  trend: number
  icon: LucideIcon
  color: string
}) {
  const up = trend >= 0
  return (
    <div
      className="glass card-hover rounded-2xl p-5 flex flex-col gap-3 relative overflow-hidden"
      style={{ border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-10" style={{ background: color }} />
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color: '#A0A0B8' }}>{title}</span>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}22` }}>
          <Icon size={16} style={{ color }} />
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold font-mono tracking-tight">{value}</p>
        <p className="text-xs mt-1" style={{ color: '#6B6B85' }}>{sub}</p>
      </div>
      <div className="flex items-center gap-1 text-xs font-medium">
        {up ? <ChevronUp size={14} style={{ color: '#06D6A0' }} /> : <ChevronDown size={14} style={{ color: '#EF4444' }} />}
        <span style={{ color: up ? '#06D6A0' : '#EF4444' }}>{Math.abs(trend)}% vs mes anterior</span>
      </div>
    </div>
  )
}