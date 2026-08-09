import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { PatrimonyPoint } from '@/data/mockData'
import ChartTooltip from '@/components/charts/ChartTooltip'

type EvolutionPoint = PatrimonyPoint & { costo?: number }

export default function AreaEvolutionChart({ data, color, name = 'Valor', secondaryColor = '#7C3AED', height = 220 }: {
  data: EvolutionPoint[]
  color: string
  name?: string
  secondaryColor?: string
  height?: number
}) {
  const gradientId = `grad-${color.replace('#', '')}`
  const grad2Id = `grad-${secondaryColor.replace('#', '')}`
  const hasSecondary = data.some(d => d.costo !== undefined)
  const mainName = hasSecondary ? 'Valor actual' : name
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
          <linearGradient id={grad2Id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={secondaryColor} stopOpacity={0.2} />
            <stop offset="95%" stopColor={secondaryColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="month" tick={{ fill: '#6B6B85', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#6B6B85', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
        <Tooltip content={<ChartTooltip />} />
        {hasSecondary && (
          <Area type="monotone" dataKey="costo" name="Costo" stroke={secondaryColor} strokeWidth={2} strokeDasharray="5 4" fill={`url(#${grad2Id})`} dot={false} />
        )}
        <Area type="monotone" dataKey="valor" name={mainName} stroke={color} strokeWidth={2} fill={`url(#${gradientId})`} dot={{ fill: color, r: 3, strokeWidth: 0 }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}