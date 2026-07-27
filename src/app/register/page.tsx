'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Mic, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { apiPost } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const [text, setText] = useState('')
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return

    setProcessing(true)
    setResult(null)
    setError(null)

    try {
      const data = await apiPost('/api/voice', { texto: text })
      setResult(data)
      setText('')
      toast.success(data.message)
    } catch (err: any) {
      setError(err.message)
      toast.error(err.message)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 ml-60 p-6">
        <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
          <div>
            <h1 className="text-3xl font-bold">Registro por Voz</h1>
            <p className="text-muted-foreground mt-1">
              Escribe o habla de forma natural para registrar tus movimientos
            </p>
          </div>

          <Card>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Ej: Hoy gasté 350 pesos en tacos. Ayer compré gasolina por 900. Me pagaron la quincena de 18,000."
                    className="w-full min-h-[120px] p-4 rounded-lg border bg-secondary/50 text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                    disabled={processing}
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={!text.trim() || processing}
                    className="flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {processing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Mic className="h-5 w-5" />}
                    {processing ? 'Procesando...' : 'Registrar'}
                  </button>
                  <button type="button" onClick={() => setText('')} className="px-4 py-3 rounded-lg border border-border hover:bg-secondary transition-colors">
                    Limpiar
                  </button>
                </div>
              </form>

              {error && (
                <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-500">{error}</p>
                </div>
              )}

              {result && (
                <div className="mt-4 space-y-3 animate-slide-up">
                  <div className="flex items-center gap-2 text-green-500">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">{result.message}</span>
                  </div>
                  {result.transactions?.map((tx: any, i: number) => (
                    <Card key={i} className="bg-secondary/50">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium capitalize">{tx.tipo}</span>
                          <span className="text-lg font-bold">{formatCurrency(tx.monto)}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                          <span>Categoría: {tx.categoria}</span>
                          <span>Cuenta: {tx.cuenta || 'No especificada'}</span>
                          {tx.comercio && <span>Comercio: {tx.comercio}</span>}
                          {tx.persona_relacionada && <span>Persona: {tx.persona_relacionada}</span>}
                          {tx.descripcion && <span className="col-span-2">{tx.descripcion}</span>}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ejemplos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                {[
                  'Hoy gasté 350 pesos en tacos',
                  'Ayer compré gasolina por 900',
                  'Me pagaron la quincena de 18,000',
                  'Juan me regresó 500',
                  'Le presté 1,200 a Carlos',
                  'Compré una televisión a 18 meses',
                  'Pagué la tarjeta HSBC',
                  'Compré café y pan por 180',
                  'Gasté 250 en Uber y luego 120 en comida',
                ].map((frase, i) => (
                  <button key={i} onClick={() => setText(frase)}
                    className="text-left p-2 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
                    &ldquo;{frase}&rdquo;
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
