import { useEffect, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react'
import AreaEvolutionChart from '@/components/charts/AreaEvolutionChart'
import InvestmentFormModal from '@/components/investments/InvestmentFormModal'
import {
  createInvestment,
  deleteInvestment,
  fetchInvestments,
  refreshAllInvestments,
  refreshInvestment,
  updateInvestment,
  type ApiInvestment,
} from '@/api/investments'
import { fmt } from '@/utils/format'
import type { ShowToast } from '@/types'

export type PortfolioPoint = { month: string; valor: number; costo?: number }

const TYPE_COLORS: Record<string, string> = {
  etf: '#3B82F6',
  stock: '#06D6A0',
  crypto: '#F59E0B',
  fixed_income: '#7C3AED',
  other: '#8B5CF6',
}

const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function buildEvolution(investments: ApiInvestment[]): PortfolioPoint[] {
  const points: PortfolioPoint[] = []
  if (investments.length === 0) return [{ month: 'Hoy', valor: 0, costo: 0 }]

  const end = new Date()

  const dated = investments.map(inv => {
    const created = new Date(inv.created_at)
    const base = inv.purchase_date ? new Date(inv.purchase_date + 'T00:00:00') : created
    const units = Number(inv.units)
    const avg = Number(inv.average_cost) || 0
    const curr = inv.current_price != null ? Number(inv.current_price) : avg
    const costo = units * avg
    const valor = units * curr
    return { base, costo, valor }
  })

  const start = dated.reduce((min, d) => (d.base < min ? d.base : min), dated[0].base)
  const startMonth = new Date(start.getFullYear(), start.getMonth(), 1)
  const cursor = startMonth

  while (cursor <= end) {
    const monthLabel = `${MONTHS_ES[cursor.getMonth()]} ${String(cursor.getFullYear()).slice(2)}`

    let costo = 0
    let valor = 0
    for (const d of dated) {
      if (d.base <= cursor) {
        costo += d.costo
        // Interpolación lineal entre costo (fecha de compra) y valor actual (hoy)
        const span = Math.max(1, end.getTime() - d.base.getTime())
        const frac = Math.min(1, Math.max(0, (cursor.getTime() - d.base.getTime()) / span))
        valor += d.costo + (d.valor - d.costo) * frac
      }
    }

    points.push({ month: monthLabel, costo, valor })
    cursor.setMonth(cursor.getMonth() + 1)
  }

  return points
}

export default function InvestmentsScreen({ showToast }: { showToast: ShowToast }) {
  const [investments, setInvestments] = useState<ApiInvestment[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshingIds, setRefreshingIds] = useState<number[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ApiInvestment | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      setInvestments(await fetchInvestments())
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al cargar inversiones', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const marketValue = (i: ApiInvestment) => Number(i.units) * (i.current_price != null ? Number(i.current_price) : Number(i.average_cost))
  const costBasis = (i: ApiInvestment) => Number(i.units) * Number(i.average_cost)

  const totalValue = investments.reduce((s, i) => s + marketValue(i), 0)
  const totalCost = investments.reduce((s, i) => s + costBasis(i), 0)
  const totalGain = totalValue - totalCost
  const gainPct = totalCost > 0 ? ((totalGain / totalCost) * 100).toFixed(2) : '0.00'

  const openCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (inv: ApiInvestment) => {
    setEditing(inv)
    setModalOpen(true)
  }

  const handleSave = async (data: Parameters<typeof createInvestment>[0]) => {
    try {
      if (editing) {
        await updateInvestment(editing.id, data)
        showToast('Inversión actualizada', 'success')
      } else {
        await createInvestment(data)
        showToast('Inversión registrada', 'success')
      }
      setModalOpen(false)
      await load()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al guardar', 'error')
    }
  }

  const handleDelete = async (inv: ApiInvestment) => {
    if (!window.confirm(`¿Eliminar la inversión "${inv.name}"?`)) return
    try {
      await deleteInvestment(inv.id)
      showToast('Inversión eliminada', 'success')
      await load()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al eliminar', 'error')
    }
  }

  const handleRefresh = async (inv: ApiInvestment) => {
    setRefreshingIds(prev => [...prev, inv.id])
    try {
      await refreshInvestment(inv.id)
      showToast(`Precio actualizado de ${inv.name}`, 'success')
      await load()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al actualizar precio', 'error')
    } finally {
      setRefreshingIds(prev => prev.filter(v => v !== inv.id))
    }
  }

  const handleRefreshAll = async () => {
    setRefreshing(true)
    try {
      const result = await refreshAllInvestments()
      await load()
      showToast(
        `Precios actualizados: ${result.successCount}/${result.total}`,
        result.successCount === result.total ? 'success' : 'error'
      )
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al actualizar precios', 'error')
    } finally {
      setRefreshing(false)
    }
  }

  const typeLabel = (t: string) => {
    const map: Record<string, string> = {
      etf: 'ETF / Fondo',
      stock: 'Acción',
      crypto: 'Cripto',
      fixed_income: 'Renta fija',
      other: 'Otro',
    }
    return map[t] ?? t
  }

  const formatPurchase = (inv: ApiInvestment) => {
    if (!inv.purchase_date) return 'Sin fecha'
    const d = new Date(inv.purchase_date + 'T00:00:00')
    return `${MONTHS_ES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
  }

  return (
    <div className="flex flex-col gap-5 pb-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Inversiones</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefreshAll}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold"
            style={{ background: 'rgba(255,255,255,0.06)', color: refreshing ? '#6B6B85' : '#A0A0B8', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Actualizar precios
          </button>
          <button
            onClick={openCreate}
            className="btn-primary flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
          >
            <Plus size={16} /> Agregar
          </button>
        </div>
      </div>

      <div className="glass rounded-2xl p-5" style={{ border: '1px solid rgba(6,214,160,0.2)' }}>
        <p className="text-sm" style={{ color: '#A0A0B8' }}>Valor del Portafolio</p>
        <p className="text-4xl font-bold font-mono mt-1">{fmt(totalValue)}</p>
        <div className="flex items-center gap-2 mt-2">
          {totalGain >= 0
            ? <ArrowUpRight size={16} style={{ color: '#06D6A0' }} />
            : <ArrowDownRight size={16} style={{ color: '#EF4444' }} />}
          <span className="text-sm font-semibold" style={{ color: totalGain >= 0 ? '#06D6A0' : '#EF4444' }}>
            {totalGain >= 0 ? '+' : ''}{fmt(totalGain)} ({gainPct}%)
          </span>
          <span className="text-xs" style={{ color: '#6B6B85' }}>vs costo de adquisición</span>
        </div>
      </div>

      <div className="glass rounded-2xl p-5" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Evolución del Portafolio</h3>
          <div className="flex items-center gap-4 text-[11px]" style={{ color: '#6B6B85' }}>
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded" style={{ background: '#06D6A0' }} /> Valor actual</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded" style={{ background: '#7C3AED', borderTop: '2px dashed #7C3AED', height: 0 }} /> Costo</span>
          </div>
        </div>
        <AreaEvolutionChart data={buildEvolution(investments)} color="#06D6A0" height={180} />
      </div>

      {loading ? (
        <div className="py-16 flex justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-purple-600 animate-spin" />
        </div>
      ) : investments.length === 0 ? (
        <div className="py-16 text-center text-sm rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', color: '#6B6B85' }}>
          No hay inversiones registradas. Agrega una con el botón "Agregar".
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {investments.map(inv => {
            const value = marketValue(inv)
            const cost = costBasis(inv)
            const gain = value - cost
            const gainPctI = cost > 0 ? ((gain / cost) * 100).toFixed(2) : '0.00'
            const isUp = gain >= 0
            const color = TYPE_COLORS[inv.type] ?? '#8B5CF6'
            const ticker = (inv.ticker || inv.name).slice(0, 4).toUpperCase()
            const isRefreshingThis = refreshingIds.includes(inv.id)
            return (
              <div key={inv.id} className="glass card-hover rounded-2xl p-4" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs" style={{ background: `${color}22`, color }}>
                      {ticker}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{inv.name}</p>
                      <p className="text-xs" style={{ color: '#6B6B85' }}>
                        {inv.units} unidades · {fmt(inv.average_cost)} c/u · {typeLabel(inv.type)}
                        {inv.broker ? ` · ${inv.broker}` : ''}
                      </p>
                      {inv.purchase_date && (
                        <p className="text-[11px] mt-0.5" style={{ color: '#A0A0B8' }}>Comprada: {formatPurchase(inv)}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-base font-bold font-mono">{fmt(value)}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full font-mono" style={{
                        background: isUp ? 'rgba(6,214,160,0.15)' : 'rgba(239,68,68,0.15)',
                        color: isUp ? '#06D6A0' : '#EF4444',
                      }}>
                        {isUp ? '+' : ''}{gainPctI}%
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <button onClick={() => handleRefresh(inv)} disabled={isRefreshingThis} className="p-2 rounded-lg hover:bg-white/10" style={{ color: '#A0A0B8' }} title="Actualizar precio">
                        <RefreshCw size={15} className={isRefreshingThis ? 'animate-spin' : ''} />
                      </button>
                      <button onClick={() => openEdit(inv)} className="p-2 rounded-lg hover:bg-white/10" style={{ color: '#A0A0B8' }}>
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => handleDelete(inv)} className="p-2 rounded-lg hover:bg-white/10" style={{ color: '#F87171' }}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <InvestmentFormModal
        key={editing?.id ?? 'new'}
        open={modalOpen}
        investment={editing}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />

      <button
        onClick={openCreate}
        className="btn-primary fixed bottom-20 sm:bottom-6 right-6 w-14 h-14 rounded-2xl flex items-center justify-center z-30 animate-pulse-glow sm:hidden"
      >
        <Plus size={24} color="white" />
      </button>
    </div>
  )
}