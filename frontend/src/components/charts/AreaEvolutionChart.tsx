import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { PatrimonyPoint } from '@/data/mockData'
import ChartTooltip from '@/components/charts/ChartTooltip'

export default function AreaEvolutionChart({ data, color, name, height = 220 }: {
  data: PatrimonyPoint[]
  color: string
  name: string
  height?: number
}) {
  const gradientId = `grad-${color.replace('#', '')}`
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="month" tick={{ fill: '#6B6B85', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#6B6B85', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
        <Tooltip content={<ChartTooltip />} />
        <Area type="monotone" dataKey="valor" name={name} stroke={color} strokeWidth={2} fill={`url(#${gradientId})`} dot={{ fill: color, r: 3, strokeWidth: 0 }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}