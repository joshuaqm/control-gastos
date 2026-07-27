'use client'

import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, getCurrentMonth } from '@/lib/utils'
import { apiFetch, apiPost } from '@/lib/api'
import { Plus, Loader2, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<any[]>([])
  const [spending, setSpending] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ categoria: '', monto_limite: '' })

  useEffect(() => { loadBudgets() }, [])

  async function loadBudgets() {
    try {
      const currentMonth = getCurrentMonth()
      const [year, month] = currentMonth.split('-').map(Number)

      const txData = await apiFetch<{ transactions: any[] }>(`/api/transactions?from=${currentMonth}-01&limit=1000`)

      const spendingByCat: Record<string, number> = {}
      txData.transactions
        .filter((t: any) => t.tipo === 'gasto' || t.tipo === 'compra_meses')
        .forEach((t: any) => {
          spendingByCat[t.categoria] = (spendingByCat[t.categoria] || 0) + Number(t.monto)
        })

      setSpending(spendingByCat)

      const res = await fetch('/api/budgets')
      const data = await res.json()
      setBudgets(data.budgets || [])
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  async function createBudget(e: React.FormEvent) {
    e.preventDefault()
    try {
      await apiPost('/api/voice', {
        tipo: 'presupuesto',
        categoria: form.categoria,
        monto_limite: Number(form.monto_limite),
      })
      toast.success('Presupuesto creado')
      setShowForm(false)
      setForm({ categoria: '', monto_limite: '' })
      loadBudgets()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 ml-60 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 ml-60 p-6 space-y-6">
        <div className="flex items-center justify-between animate-fade-in">
          <div>
            <h1 className="text-3xl font-bold">Presupuestos</h1>
            <p className="text-muted-foreground">Controla tu gasto por categoría</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-all"
          >
            <Plus className="h-4 w-4" /> Nuevo presupuesto
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgets.length === 0 && (
            <Card className="col-span-full">
              <CardContent className="p-12 text-center text-muted-foreground">
                <p>No tienes presupuestos. Crea uno desde el registro por voz.</p>
              </CardContent>
            </Card>
          )}

          {budgets.map((budget: any) => {
            const gastado = spending[budget.categoria] || 0
            const porcentaje = (gastado / budget.monto_limite) * 100
            const isOver = porcentaje > 100
            const isWarning = porcentaje > 80

            return (
              <Card key={budget.id} className="animate-fade-in">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-medium">{budget.categoria}</p>
                      <p className="text-2xl font-bold mt-1">
                        {formatCurrency(gastado)}
                        <span className="text-sm text-muted-foreground font-normal"> / {formatCurrency(budget.monto_limite)}</span>
                      </p>
                    </div>
                    {(isOver || isWarning) && <AlertTriangle className={`h-5 w-5 ${isOver ? 'text-red-500' : 'text-yellow-500'}`} />}
                  </div>

                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${isOver ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-green-500'}`}
                      style={{ width: `${Math.min(porcentaje, 100)}%` }} />
                  </div>

                  <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                    <span>{porcentaje.toFixed(0)}% usado</span>
                    <span>{isOver ? `Exceso: ${formatCurrency(gastado - budget.monto_limite)}` : `Restan: ${formatCurrency(budget.monto_limite - gastado)}`}</span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </main>
    </div>
  )
}
