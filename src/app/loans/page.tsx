'use client'

import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { apiFetch } from '@/lib/api'
import { ArrowUpRight, ArrowDownRight, Loader2 } from 'lucide-react'

export default function LoansPage() {
  const [loans, setLoans] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadLoans() }, [])

  async function loadLoans() {
    try {
      const [loansData, txData] = await Promise.all([
        apiFetch<{ loans: any[] }>('/api/loans'),
        apiFetch<{ transactions: any[] }>('/api/transactions?limit=100'),
      ])

      setLoans(loansData.loans || [])
      setTransactions(
        (txData.transactions || []).filter(
          (t: any) => ['prestamo_otorgado', 'prestamo_recibido', 'pago_deuda'].includes(t.tipo)
        )
      )
    } catch (error) {
      console.error('Error loading loans:', error)
    } finally {
      setLoading(false)
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

  const prestamosOtorgados = loans.filter((l: any) => l.tipo === 'otorgado')
  const prestamosRecibidos = loans.filter((l: any) => l.tipo === 'recibido')

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 ml-60 p-6 space-y-6">
        <div className="animate-fade-in">
          <h1 className="text-3xl font-bold">Préstamos</h1>
          <p className="text-muted-foreground">Control de préstamos y deudas</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowUpRight className="h-5 w-5 text-green-500" />
                Me deben
              </CardTitle>
            </CardHeader>
            <CardContent>
              {prestamosOtorgados.length === 0 ? (
                <p className="text-muted-foreground text-sm">No hay préstamos otorgados</p>
              ) : (
                <div className="space-y-3">
                  {prestamosOtorgados.map((loan: any) => (
                    <div key={loan.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                      <div>
                        <p className="font-medium">{loan.persona}</p>
                        <p className="text-xs text-muted-foreground">Original: {formatCurrency(loan.monto_original)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-500">{formatCurrency(loan.saldo_pendiente)}</p>
                        {loan.saldo_pendiente < loan.monto_original && (
                          <p className="text-xs text-muted-foreground">Pagado: {formatCurrency(loan.monto_original - loan.saldo_pendiente)}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowDownRight className="h-5 w-5 text-red-500" />
                Debo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {prestamosRecibidos.length === 0 ? (
                <p className="text-muted-foreground text-sm">No hay préstamos recibidos</p>
              ) : (
                <div className="space-y-3">
                  {prestamosRecibidos.map((loan: any) => (
                    <div key={loan.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                      <div>
                        <p className="font-medium">{loan.persona}</p>
                        <p className="text-xs text-muted-foreground">Original: {formatCurrency(loan.monto_original)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-red-500">{formatCurrency(loan.saldo_pendiente)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Historial</CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <p className="text-muted-foreground text-sm">No hay movimientos de préstamos</p>
            ) : (
              <div className="space-y-2">
                {transactions.map((tx: any) => (
                  <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 text-sm">
                    <div className="flex items-center gap-3">
                      {tx.tipo === 'prestamo_otorgado' ? <ArrowUpRight className="h-4 w-4 text-green-500" /> :
                       tx.tipo === 'prestamo_recibido' ? <ArrowDownRight className="h-4 w-4 text-red-500" /> :
                       <ArrowUpRight className="h-4 w-4 text-blue-500" />}
                      <div>
                        <p className="capitalize">
                          {tx.tipo === 'prestamo_otorgado' ? 'Presté a' :
                           tx.tipo === 'prestamo_recibido' ? 'Me prestó' :
                           'Pago de deuda'} {tx.persona_relacionada}
                        </p>
                        <p className="text-xs text-muted-foreground">{new Date(tx.fecha).toLocaleDateString('es-MX')} · {tx.descripcion || ''}</p>
                      </div>
                    </div>
                    <span className="font-medium">{formatCurrency(tx.monto)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
