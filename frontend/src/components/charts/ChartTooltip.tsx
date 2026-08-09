import { fmt } from '@/utils/format'

type TooltipPayload = { name: string; value: number; color: string }

export default function ChartTooltip({ active, payload, label }: {
  active?: boolean
  payload?: TooltipPayload[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass px-3 py-2 rounded-lg text-xs">
      <p className="text-[#A0A0B8] mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-mono font-medium">
          {p.name}: {fmt(p.value)}
        </p>
      ))}
    </div>
  )
}