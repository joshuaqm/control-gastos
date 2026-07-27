'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { apiFetch } from '@/lib/api'
import { Search, Loader2, Clock, ArrowUpRight, ArrowDownRight } from 'lucide-react'

const suggestions = ['cafés', 'Amazon', 'viaje a Oaxaca', 'Juan', 'HSBC', 'comida', 'Uber', 'gasolina']

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setSearched(true)

    try {
      const data = await apiFetch<{ transactions: any[] }>(`/api/search?q=${encodeURIComponent(query)}`)
      setResults(data.transactions || [])
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 ml-60 p-6">
        <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
          <div>
            <h1 className="text-3xl font-bold">Buscador Inteligente</h1>
            <p className="text-muted-foreground mt-1">Encuentra cualquier movimiento</p>
          </div>

          <form onSubmit={handleSearch}>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Busca por descripción, categoría, comercio, persona..."
                className="w-full pl-12 pr-4 py-4 rounded-xl border bg-secondary/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-lg"
              />
            </div>
          </form>

          <div className="flex flex-wrap gap-2">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => { setQuery(s); setTimeout(() => handleSearch(), 0) }}
                className="px-3 py-1.5 rounded-full border text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                {s}
              </button>
            ))}
          </div>

          {loading && (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          )}

          {searched && !loading && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {results.length} resultado(s) para &ldquo;{query}&rdquo;
              </p>

              {results.length === 0 && (
                <Card>
                  <CardContent className="p-12 text-center text-muted-foreground">
                    <p>No se encontraron resultados</p>
                  </CardContent>
                </Card>
              )}

              {results.map((tx: any) => (
                <Card key={tx.id} className="animate-slide-up">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg mt-1 ${
                          tx.tipo === 'ingreso' ? 'bg-green-500/10' : 'bg-red-500/10'
                        }`}>
                          {tx.tipo === 'ingreso'
                            ? <ArrowUpRight className="h-4 w-4 text-green-500" />
                            : <ArrowDownRight className="h-4 w-4 text-red-500" />}
                        </div>
                        <div>
                          <p className="font-medium">{tx.descripcion || tx.categoria}</p>
                          <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
                            <span className="capitalize">{tx.tipo}</span>
                            <span>·</span>
                            <span>{tx.categoria}</span>
                            {tx.comercio && <><span>·</span><span>{tx.comercio}</span></>}
                            {tx.persona_relacionada && <><span>·</span><span>{tx.persona_relacionada}</span></>}
                            <span>·</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(tx.fecha).toLocaleDateString('es-MX')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className={`text-lg font-bold ${
                        tx.tipo === 'ingreso' ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {tx.tipo === 'ingreso' ? '+' : '-'}{formatCurrency(tx.monto)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
