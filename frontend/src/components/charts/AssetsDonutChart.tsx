import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { assetsData } from '@/data/mockData'
import { fmt } from '@/utils/format'
import ChartTooltip from '@/components/charts/ChartTooltip'

export default function AssetsDonutChart() {
  return (
    <>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie data={assetsData} cx="50%" cy="50%" outerRadius={75} paddingAngle={2} dataKey="value">
            {assetsData.map(entry => <Cell key={entry.name} fill={entry.color} strokeWidth={0} />)}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-col gap-1.5 mt-2">
        {assetsData.map(a => (
          <div key={a.name} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: a.color }} />
              <span style={{ color: '#A0A0B8' }}>{a.name}</span>
            </div>
            <span className="font-mono">{fmt(a.value)}</span>
          </div>
        ))}
      </div>
    </>
  )
}