import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { fmt } from "@/utils/format"
import type { ChartDatum } from "@/utils/dashboardCalc"

const THEO_COLOR = "#F59E0B"
const REAL_COLOR = "#06D6A0"

export default function TheoreticalInterestChart({
  data,
}: {
  data: ChartDatum[]
}) {
  if (data.every((d) => d.valor <= 0)) {
    return (
      <div className="py-10 flex items-center justify-center">
        <p className="text-xs" style={{ color: "#6B6B85" }}>
          Aún no hay rendimientos registrados este mes. Se generan teóricos
          semanales en cuentas con tasa de interés.
        </p>
      </div>
    )
  }
  return (
    <>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} barGap={4}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.05)"
          />
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
            tickFormatter={(v) => `$${v}`}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null
              const d = payload[0].payload as ChartDatum
              const color = d.isReal ? REAL_COLOR : THEO_COLOR
              return (
                <div className="glass px-3 py-2 rounded-lg text-xs">
                  <p className="text-[#A0A0B8] mb-1">{label}</p>
                  <p className="font-mono font-medium" style={{ color }}>
                    {d.isReal ? "Rendimiento real" : "Rendimiento teórico"}:{" "}
                    {fmt(d.valor)}
                  </p>
                </div>
              )
            }}
          />
          <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
            {data.map((d) => (
              <Cell
                key={d.month}
                fill={d.isReal ? REAL_COLOR : THEO_COLOR}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-4 mt-2 text-[11px]">
        <span
          className="flex items-center gap-1.5"
          style={{ color: "#A0A0B8" }}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: THEO_COLOR }}
          />
          Teórico semanal
        </span>
        <span
          className="flex items-center gap-1.5"
          style={{ color: "#A0A0B8" }}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: REAL_COLOR }}
          />
          Real mensual
        </span>
      </div>
    </>
  )
}