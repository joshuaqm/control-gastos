'use client'

import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { apiFetch } from '@/lib/api'
import { supabase } from '@/lib/supabase-browser'
import { Plus, Target, Loader2, TrendingUp } from 'lucide-react'
import toast from 'react-hot-toast'

export default function GoalsPage() {
  const [goals, setGoals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nombre: '', monto_objetivo: '', fecha_limite: '' })

  useEffect(() => { loadGoals() }, [])

  async function loadGoals() {
    try {
      const data = await apiFetch<{ goals: any[] }>('/api/goals')
      setGoals(data.goals || [])
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  async function createGoal(e: React.FormEvent) {
    e.preventDefault()
    try {
      const { error } = await supabase.from('metas').insert({
        nombre: form.nombre,
        monto_objetivo: Number(form.monto_objetivo),
        fecha_limite: form.fecha_limite || null,
      })
      if (error) throw error
      toast.success('Meta creada')
      setShowForm(false)
      setForm({ nombre: '', monto_objetivo: '', fecha_limite: '' })
      loadGoals()
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
            <h1 className="text-3xl font-bold">Metas financieras</h1>
            <p className="text-muted-foreground">Define y da seguimiento a tus objetivos</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-all"
          >
            <Plus className="h-4 w-4" /> Nueva meta
          </button>
        </div>

        {showForm && (
          <Card className="animate-slide-up">
            <CardContent className="p-4">
              <form onSubmit={createGoal} className="flex gap-3 flex-wrap">
                <input type="text" placeholder="Nombre" value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border bg-secondary/50" required />
                <input type="number" placeholder="Monto objetivo" value={form.monto_objetivo}
                  onChange={e => setForm(f => ({ ...f, monto_objetivo: e.target.value }))}
                  className="w-40 px-3 py-2 rounded-lg border bg-secondary/50" required />
                <input type="date" value={form.fecha_limite}
                  onChange={e => setForm(f => ({ ...f, fecha_limite: e.target.value }))}
                  className="w-40 px-3 py-2 rounded-lg border bg-secondary/50" />
                <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground">Crear</button>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.length === 0 && !showForm && (
            <Card className="col-span-full">
              <CardContent className="p-12 text-center text-muted-foreground">
                <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No tienes metas financieras</p>
              </CardContent>
            </Card>
          )}

          {goals.map((goal: any) => {
            const progress = (goal.monto_actual / goal.monto_objetivo) * 100
            const remaining = goal.monto_objetivo - goal.monto_actual

            return (
              <Card key={goal.id} className="animate-fade-in">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-medium">{goal.nombre}</p>
                      <p className="text-2xl font-bold mt-1">
                        {formatCurrency(goal.monto_actual)}
                        <span className="text-sm text-muted-foreground font-normal"> / {formatCurrency(goal.monto_objetivo)}</span>
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-primary/10">
                      <TrendingUp className="h-5 w-5 text-primary" />
                    </div>
                  </div>

                  <div className="h-3 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${Math.min(progress, 100)}%` }} />
                  </div>

                  <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                    <span>{progress.toFixed(0)}% completado</span>
                    <span>Faltan {formatCurrency(remaining)}</span>
                  </div>

                  {goal.fecha_limite && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Fecha límite: {new Date(goal.fecha_limite).toLocaleDateString('es-MX')}
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </main>
    </div>
  )
}
