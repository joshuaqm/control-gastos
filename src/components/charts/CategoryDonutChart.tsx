import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import { categoryData } from "@/data/mockData"
import type { DonutDatum } from "@/utils/dashboardCalc"
import ChartTooltip from "@/components/charts/ChartTooltip"

export default function CategoryDonutChart({
  data = categoryData,
}: {
  data?: DonutDatum[]
}) {
  return (
    <>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} strokeWidth={0} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-2 gap-1 mt-2">
        {data.map((c) => (
          <div key={c.name} className="flex items-center gap-2 text-xs">
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: c.color }}
            />
            <span style={{ color: "#A0A0B8" }}>{c.name}</span>
          </div>
        ))}
      </div>
    </>
  )
}
