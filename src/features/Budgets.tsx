import { useCallback, useEffect, useState } from 'react'
import {
  Car,
  Gamepad2,
  Heart,
  Home,
  Shirt,
  ShoppingBag,
  Tag,
  Tv,
  Utensils,
  Wallet,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import {
  fetchBudgetSummary,
  updateBudget,
  createBudget,
  updateBudgetSettings,
  type BudgetCategoryGroup,
  type BudgetCategoryItem,
  type BudgetRuleRow,
  type BudgetSummary,
} from '@/api/budgets'
import { fmt, fmtSigned } from '@/utils/format'

const CATEGORY_META: Record<string, { icon: LucideIcon; color: string }> = {
  Comida: { icon: Utensils, color: '#06D6A0' },
  Transporte: { icon: Car, color: '#F59E0B' },
  Vivienda: { icon: Home, color: '#7C3AED' },
  Salud: { icon: Heart, color: '#EF4444' },
  Entretenimiento: { icon: Gamepad2, color: '#8B5CF6' },
  Suscripciones: { icon: Tv, color: '#3B82F6' },
  Servicios: { icon: Zap, color: '#F59E0B' },
  Compras: { icon: ShoppingBag, color: '#06D6A0' },
  Ropa: { icon: Shirt, color: '#EC4899' },
  Otros: { icon: Tag, color: '#A3A3C2' },
}

const catMeta = (name: string) => CATEGORY_META[name] ?? { icon: Tag, color: '#A3A3C2' }

function PercentEditor({ value, color, onSave }: {
  value: number
  color?: string
  onSave: (v: number) => void
}) {
  const [draft, setDraft] = useState(String(value))
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) setDraft(String(value))
  }, [value, focused])

  const commit = () => {
    const n = Math.min(100, Math.max(0, Number(draft) || 0))
    if (n !== value) {
      onSave(n)
    } else {
      setDraft(String(value))
    }
    setFocused(false)
  }

  return (
    <input
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
        if (e.key === 'Escape') {
          setDraft(String(value))
          setFocused(false)
          ;(e.target as HTMLInputElement).blur()
        }
      }}
      inputMode="decimal"
      className="w-14 px-2 py-1 rounded-lg text-xs font-mono font-semibold text-right"
      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: color || '#fff' }}
    />
  )
}

function ProgressBar({ pct, color, over }: { pct: number; color: string; over: boolean }) {
  return (
    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
      <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: over ? '#EF4444' : color }} />
    </div>
  )
}

function RuleRow({ row, saving, onSavePct }: {
  row: BudgetRuleRow
  saving: boolean
  onSavePct: (row: BudgetRuleRow, pct: number) => void
}) {
  const pctUsed = row.target > 0 ? Math.round((row.spent / row.target) * 100) : 0
  const over = row.target > 0 && row.spent > row.target
  return (
    <div className="mb-4 last:mb-0">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{row.icon}</span>
          <div>
            <p className="text-sm font-semibold">{row.name}</p>
            <p className="text-sm inline-flex items-center gap-1" style={{ color: '#6B6B85' }}>
              <PercentEditor value={row.percentage} color={row.color} onSave={pct => onSavePct(row, pct)} />% del ingreso
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-mono font-bold" style={{ color: over ? '#EF4444' : '#fff' }}>{fmt(row.spent)}</p>
          <p className="text-xs" style={{ color: '#6B6B85' }}>de {fmt(row.target)}{saving ? ' ·…' : ''}</p>
        </div>
      </div>
      <ProgressBar pct={pctUsed} color={row.color} over={over} />
      <div className="flex justify-between mt-1 text-xs">
        <span style={{ color: over ? '#EF4444' : '#6B6B85' }}>
          {over ? 'Sobregasto: ' : 'Restante: '}{fmtSigned(row.remaining)}
        </span>
        <span style={{ color: over ? '#EF4444' : row.color }}>{pctUsed}%</span>
      </div>
    </div>
  )
}

function CategoryItemRow({ item, groupTotal, color }: {
  item: BudgetCategoryItem
  groupTotal: number
  color: string
}) {
  const meta = catMeta(item.category)
  const Icon = meta.icon
  const barPct = groupTotal > 0 ? Math.round((item.spent / groupTotal) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${meta.color}22` }}>
        <Icon size={14} style={{ color: meta.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium">{item.category}</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono font-semibold">{fmt(item.spent)}</span>
            <span className="text-xs w-10 text-right font-mono" style={{ color: '#A0A0B8' }}>{item.share}%</span>
          </div>
        </div>
        <ProgressBar pct={barPct} color={color} over={false} />
      </div>
    </div>
  )
}

function CategoryGroup({ group }: { group: BudgetCategoryGroup }) {
  return (
    <div className="mb-5 last:mb-0">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{group.icon}</span>
          <div>
            <p className="text-sm font-semibold">{group.name}</p>
            {group.items.length > 1 && (
              <p className="text-[11px]" style={{ color: '#6B6B85' }}>Categorías según su clasificación al registrarlas</p>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-mono font-bold">{fmt(group.total)}</p>
          <p className="text-xs" style={{ color: group.color }}>{group.share}% del gasto</p>
        </div>
      </div>
      <ProgressBar pct={group.share} color={group.color} over={false} />
      {group.items.length > 0 && (
        <div className="mt-3 flex flex-col gap-3">
          {group.items.map(it => (
            <CategoryItemRow key={it.category} item={it} groupTotal={group.total} color={group.color} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function BudgetsScreen() {
  const [summary, setSummary] = useState<BudgetSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [incomeDraft, setIncomeDraft] = useState('')
  const [savingKey, setSavingKey] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data = await fetchBudgetSummary()
      setSummary(data)
      setIncomeDraft(String(data.theoreticalIncome))
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar presupuestos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const saveIncome = async () => {
    const n = Number(incomeDraft) || 0
    if (!summary) return
    if (n === summary.theoreticalIncome) return
    try {
      setSavingKey('income')
      await updateBudgetSettings(n)
      await load()
    } catch {
      setError('Error al guardar el ingreso')
    } finally {
      setSavingKey(null)
    }
  }

  const saveRulePct = async (row: BudgetRuleRow, pct: number) => {
    try {
      setSavingKey(`rule:${row.budgetType}`)
      if (row.id) {
        await updateBudget(row.id, { percentage: pct })
      } else {
        await createBudget({ budget_type: row.budgetType, percentage: pct })
      }
      await load()
    } catch {
      setError(`Error al guardar ${row.name}`)
    } finally {
      setSavingKey(null)
    }
  }

  if (loading && !summary) {
    return (
      <div className="flex flex-col gap-5 pb-6">
        <h2 className="text-xl font-bold">Presupuestos</h2>
        <div className="glass rounded-2xl p-6 text-sm" style={{ border: '1px solid rgba(255,255,255,0.08)', color: '#6B6B85' }}>
          Cargando presupuestos…
        </div>
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="flex flex-col gap-5 pb-6">
        <h2 className="text-xl font-bold">Presupuestos</h2>
        <div className="glass rounded-2xl p-6 text-sm" style={{ border: '1px solid rgba(255,255,255,0.08)', color: '#EF4444' }}>
          {error || 'No se pudieron cargar los presupuestos'}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 pb-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Presupuestos</h2>
        {error ? <span className="text-xs" style={{ color: '#EF4444' }}>{error}</span> : null}
      </div>

      <div className="glass rounded-2xl p-5" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-base font-semibold">Regla 50/30/20</h3>
          <span className="text-xs" style={{ color: '#6B6B85' }}>{summary.monthLabel}</span>
        </div>
        <p className="text-xs mb-4" style={{ color: '#6B6B85' }}>
          Basado en ingresos mensuales de{' '}
          <input
            value={incomeDraft}
            onChange={e => setIncomeDraft(e.target.value)}
            onBlur={saveIncome}
            onKeyDown={e => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
              if (e.key === 'Escape') {
                setIncomeDraft(String(summary.theoreticalIncome))
                ;(e.target as HTMLInputElement).blur()
              }
            }}
            inputMode="numeric"
            className="w-24 px-2 py-0.5 rounded-lg text-xs font-mono text-right"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
          />
        </p>
        <div className="flex items-center gap-2 mb-4 p-3 rounded-xl" style={{ background: 'rgba(6,214,160,0.08)', border: '1px solid rgba(6,214,160,0.15)' }}>
          <Wallet size={15} style={{ color: '#06D6A0' }} />
          <span className="text-xs font-medium" style={{ color: '#06D6A0' }}>
            Ingreso real del mes ({summary.monthLabel}): <span className="font-mono font-bold">{fmt(summary.realIncome)}</span>
            {savingKey === 'income' ? ' · guardando…' : ''}
          </span>
        </div>
        {summary.rule.map(r => (
          <RuleRow key={r.budgetType} row={r} saving={savingKey === `rule:${r.budgetType}`} onSavePct={saveRulePct} />
        ))}
      </div>

      <div className="glass rounded-2xl p-5" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
        <h3 className="text-base font-semibold mb-1">Por Categoría</h3>
        <p className="text-xs mb-4" style={{ color: '#6B6B85' }}>
          Movimientos del mes ({summary.monthLabel}): <span className="font-mono" style={{ color: '#fff' }}>{fmt(summary.totalSpent)}</span>, clasificado por Necesidad, Deseo, Ahorro o No aplica.
        </p>
        {summary.categories.map(g => (
          <CategoryGroup key={g.budgetType ?? 'none'} group={g} />
        ))}
        {summary.totalSpent <= 0 && (
          <p className="text-xs" style={{ color: '#6B6B85' }}>
            No hay movimientos este mes. Al registrar movimientos clasifícalos como necesidad, deseo, ahorro o ninguno.
          </p>
        )}
      </div>
    </div>
  )
}