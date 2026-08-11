import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { cashFlowData } from "@/data/mockData"
import type { CashFlowPoint } from "@/utils/dashboardCalc"
import ChartTooltip from "@/components/charts/ChartTooltip"

export default function CashFlowBarChart({
  data = cashFlowData,
}: {
  data?: CashFlowPoint[]
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis
          dataKey="month"
          tick={{ fill: "#6B6B85", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "#6B6B85", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip content={<ChartTooltip />} />
        <Bar
          dataKey="ingresos"
          name="Ingresos"
          fill="#06D6A0"
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="gastos"
          name="Gastos"
          fill="#EF4444"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
