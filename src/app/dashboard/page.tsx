'use client'

import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, getCurrentMonth, getMonthName, generateColor } from '@/lib/utils'
import { apiFetch } from '@/lib/api'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Wallet, PiggyBank, HandCoins,
} from 'lucide-react'

export default function DashboardPage() {
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadDashboard() }, [])

  async function loadDashboard() {
    try {
      const currentMonth = getCurrentMonth()

      const [ingresos, gastos, gastosTotales, prestamos, metas] = await Promise.all([
        apiFetch<{ transactions: any[] }>(`/api/transactions?tipo=ingreso&from=${currentMonth}-01&limit=200`),
        apiFetch<{ transactions: any[] }>(`/api/transactions?tipo=gasto&from=${currentMonth}-01&limit=200`),
        apiFetch<{ transactions: any[] }>(`/api/transactions?from=${currentMonth}-01&limit=1000`),
        apiFetch<{ loans: any[] }>('/api/loans'),
        apiFetch<{ goals: any[] }>('/api/goals'),
      ])

      const totalIngresos = ingresos.transactions.reduce((s: number, t: any) => s + Number(t.monto), 0)
      const totalGastos = gastos.transactions.reduce((s: number, t: any) => s + Number(t.monto), 0)

      const filteredGastos = gastosTotales.transactions.filter(
        (t: any) => t.tipo === 'gasto' || t.tipo === 'compra_meses'
      )

      const gastosPorCategoria = Object.entries(
        filteredGastos.reduce((acc: any, t: any) => {
          acc[t.categoria] = (acc[t.categoria] || 0) + Number(t.monto)
          return acc
        }, {})
      ).map(([categoria, total]) => ({
        categoria,
        total: total as number,
        porcentaje: totalGastos > 0 ? ((total as number) / totalGastos) * 100 : 0,
      })).sort((a, b) => b.total - a.total)

      const totalPrestamos = prestamos.loans.reduce(
        (s: number, l: any) => s + (l.saldo_pendiente > 0 ? Number(l.saldo_pendiente) : 0), 0
      )
      const totalAhorro = metas.goals.reduce((s: number, m: any) => s + Number(m.monto_actual), 0)

      setSummary({
        ingresos_mes: totalIngresos,
        gastos_mes: totalGastos,
        ahorro: totalIngresos - totalGastos,
        patrimonio: totalAhorro,
        prestamos_pendientes: totalPrestamos,
        gastos_por_categoria: gastosPorCategoria,
      })
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 ml-60 flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </main>
      </div>
    )
  }

  const stats = [
    { title: 'Ingresos del mes', value: summary?.ingresos_mes || 0, icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-500/10' },
    { title: 'Gastos del mes', value: summary?.gastos_mes || 0, icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-500/10' },
    { title: 'Flujo de efectivo', value: summary?.ahorro || 0, icon: Wallet, color: (summary?.ahorro || 0) >= 0 ? 'text-green-500' : 'text-red-500', bg: 'bg-blue-500/10' },
    { title: 'Ahorro total', value: summary?.patrimonio || 0, icon: PiggyBank, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { title: 'Préstamos pendientes', value: summary?.prestamos_pendientes || 0, icon: HandCoins, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  ]

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 ml-60 p-6 space-y-6">
        <div className="animate-fade-in">
          <h1 className="text-3xl font-bold mb-1">Dashboard</h1>
          <p className="text-muted-foreground">{getMonthName(getCurrentMonth())}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {stats.map((stat, i) => (
            <Card key={i} className="animate-slide-up" style={{ animationDelay: `${i * 50}ms` } as React.CSSProperties}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{stat.title}</p>
                    <p className={`text-xl font-bold ${stat.color}`}>{formatCurrency(stat.value)}</p>
                  </div>
                  <div className={`p-2 rounded-lg ${stat.bg}`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="animate-slide-up">
            <CardHeader>
              <CardTitle>Gastos por Categoría</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={summary?.gastos_por_categoria || []}
                    dataKey="total" nameKey="categoria"
                    cx="50%" cy="50%" outerRadius={100}
                    label={({ categoria, porcentaje }: any) => `${categoria} ${porcentaje.toFixed(0)}%`}
                  >
                    {(summary?.gastos_por_categoria || []).map((_: any, i: number) => (
                      <Cell key={i} fill={generateColor(i)} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="animate-slide-up">
            <CardHeader>
              <CardTitle>Top Categorías</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(summary?.gastos_por_categoria || []).slice(0, 10).map((cat: any, i: number) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: generateColor(i) }} />
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span>{cat.categoria}</span>
                        <span className="text-muted-foreground">{formatCurrency(cat.total)}</span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${cat.porcentaje}%`, backgroundColor: generateColor(i) }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
