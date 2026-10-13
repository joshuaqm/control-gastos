import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { fmt } from "@/utils/format"
import type {
  InterestAccountPoint,
  InterestByAccount,
} from "@/utils/dashboardCalc"

export default function TheoreticalInterestChart({
  points,
  series,
}: InterestByAccount) {
  const nameByKey = new Map(series.map((s) => [s.key, s.name]))
  const shortName = (name: string, max = 18) =>
    name.length > max ? `${name.slice(0, max - 1)}…` : name

  if (points.every((p) => Number(p.total) <= 0)) {
    return (
      <div className="py-10 flex items-center justify-center">
        <p className="text-xs" style={{ color: "var(--text-3)" }}>
          Aún no hay rendimientos reales registrados este mes.
        </p>
      </div>
    )
  }
  return (
    <>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={points} barGap={4}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--badge-bg)" />
          <XAxis
            dataKey="month"
            tick={{ fill: "var(--text-3)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "var(--text-3)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `$${v}`}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null
              const point = payload[0].payload as InterestAccountPoint
              return (
                <div className="glass px-3 py-2 rounded-lg text-xs">
                  <p className="text-[var(--text-2)] mb-1">{label}</p>
                  {payload
                    .filter((p) => Number(p.value) !== 0)
                    .map((p) => {
                      const key = String(p.name)
                      const fullName = nameByKey.get(key) ?? key
                      return (
                        <p
                          key={key}
                          className="font-mono"
                          style={{ color: p.color }}
                        >
                          {shortName(fullName)}: {fmt(Number(p.value))}
                        </p>
                      )
                    })}
                  <p
                    className="font-mono font-medium mt-1 pt-1"
                    style={{
                      color: "var(--text-1)",
                      borderTop: "1px solid var(--border)",
                    }}
                  >
                    Total: {fmt(point.total)}
                  </p>
                </div>
              )
            }}
          />
          {series.map((s) => (
            <Bar key={s.key} dataKey={s.key} stackId="a" fill={s.color} />
          ))}
        </BarChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-[11px]">
        {series.map((s) => (
          <span
            key={s.key}
            title={s.name}
            className="flex items-center gap-1.5"
            style={{ color: "var(--text-2)" }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: s.color }}
            />
            {shortName(s.name)}
          </span>
        ))}
      </div>
    </>
  )
}
