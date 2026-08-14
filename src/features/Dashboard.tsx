import { useEffect, useMemo, useState } from "react"
import {
  Banknote,
  Bell,
  CalendarClock,
  Car,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Gamepad2,
  Heart,
  Home,
  Plus,
  Repeat,
  ShoppingBag,
  Tag,
  TrendingUp,
  Tv,
  Utensils,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react"
import AIPrompt from "@/components/ai/AIPrompt"
import AddTransactionModal from "@/components/transactions/AddTransactionModal"
import TransactionRow from "@/components/transactions/TransactionRow"
import SummaryCard from "@/components/ui/SummaryCard"
import SavingsGoalCard from "@/components/ui/SavingsGoalCard"
import TheoreticalInterestChart from "@/components/charts/TheoreticalInterestChart"
import AssetsDonutChart from "@/components/charts/AssetsDonutChart"
import CashFlowBarChart from "@/components/charts/CashFlowBarChart"
import CategoryDonutChart from "@/components/charts/CategoryDonutChart"
import { fetchAccounts, type ApiAccount } from "@/api/accounts"
import { fetchTransactions, type ApiTransaction } from "@/api/transactions"
import { fetchInvestments, type ApiInvestment } from "@/api/investments"
import { fetchInstallments, type ApiInstallment } from "@/api/installments"
import { fetchDebts, type ApiDebt } from "@/api/debts"
import { fetchReceivables, type ApiReceivable } from "@/api/receivables"
import { fetchRecurring, type ApiRecurring } from "@/api/recurring"
import { fetchGoals, type ApiGoal } from "@/api/goals"
import { fetchBudgetSummary, type BudgetRuleRow } from "@/api/budgets"
import { type ScreenId } from "@/config/navigation"
import {
  addMonths,
  assetDistribution,
  cashFlowRange,
  categorySpendInRange,
  computeTotals,
  creditReminders,
  debtReminders,
  interestChartDataRange,
  interestReminders,
  monthPrefix,
  recurringReminders,
  type MonthRef,
} from "@/utils/dashboardCalc"
import { fmt } from "@/utils/format"
import type { SavingsGoal, ShowToast, Transaction } from "@/types"

const GOAL_COLORS = [
  "#7C3AED",
  "#06D6A0",
  "#F59E0B",
  "#3B82F6",
  "#EC4899",
  "#8B5CF6",
]

const CAT_ICONS: Record<string, LucideIcon> = {
  Comida: Utensils,
  Transporte: Car,
  Vivienda: Home,
  Salud: Heart,
  Entretenimiento: Gamepad2,
  Suscripciones: Tv,
  Servicios: Zap,
  Compras: ShoppingBag,
}

const fmtDate = (d: string) => {
  const dt = new Date(`${d.slice(0, 10)}T00:00:00`)
  if (Number.isNaN(dt.getTime())) return d
  return dt.toLocaleDateString("es-MX", { day: "numeric", month: "short" })
}

const banknoteIcons: Record<string, LucideIcon> = {
  income: TrendingUp,
  expense: Utensils,
  transfer: Repeat,
  debt_payment: CreditCard,
}

const daysLabel = (days: number) =>
  days < 0
    ? "Atrasado"
    : days === 0
      ? "Hoy"
      : days === 1
        ? "Mañana"
        : `En ${days} días`

export default function Dashboard({
  onOpenChat,
  showToast,
  onNavigate,
}: {
  onOpenChat: (msg?: string) => void
  showToast: ShowToast
  onNavigate: (screen: ScreenId) => void
}) {
  const [addOpen, setAddOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [accounts, setAccounts] = useState<ApiAccount[]>([])
  const [txns, setTxns] = useState<ApiTransaction[]>([])
  const [investments, setInvestments] = useState<ApiInvestment[]>([])
  const [installments, setInstallments] = useState<ApiInstallment[]>([])
  const [debts, setDebts] = useState<ApiDebt[]>([])
  const [receivables, setReceivables] = useState<ApiReceivable[]>([])
  const [recurring, setRecurring] = useState<ApiRecurring[]>([])
  const [goals, setGoals] = useState<ApiGoal[]>([])
  const [budgetRule, setBudgetRule] = useState<BudgetRuleRow[]>([])
  const [refreshKey, setRefreshKey] = useState(0)

  const load = async () => {
    try {
      const [a, t, i, inst, d, r, rec, g] = await Promise.all([
        fetchAccounts(),
        fetchTransactions(),
        fetchInvestments(),
        fetchInstallments(),
        fetchDebts(),
        fetchReceivables(),
        fetchRecurring(),
        fetchGoals(),
      ])
      setAccounts(a)
      setTxns(t)
      setInvestments(i)
      setInstallments(inst)
      setDebts(d)
      setReceivables(r)
      setRecurring(rec)
      setGoals(g)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar el dashboard")
      showToast("Error al cargar datos", "error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const accountName = useMemo(() => {
    const map = new Map(accounts.map((a) => [a.id, a.name]))
    return (id: number | null) => (id != null ? (map.get(id) ?? "") : "")
  }, [accounts])

  const totals = useMemo(
    () =>
      computeTotals({
        accounts,
        txns,
        investments,
        installments,
        debts,
        receivables,
        recurring,
        goals,
      }),
    [
      accounts,
      txns,
      investments,
      installments,
      debts,
      receivables,
      recurring,
      goals,
    ],
  )

  type RangeKey = "1M" | "3M" | "6M" | "1Y" | "YTD"
  const currentRef = useMemo<MonthRef>(() => {
    const n = new Date()
    return { year: n.getFullYear(), month: n.getMonth() }
  }, [])
  const [range, setRange] = useState<RangeKey>("1M")
  const [anchor, setAnchor] = useState<MonthRef>(currentRef)

  const rangeMonths = useMemo(() => {
    if (range === "YTD") return currentRef.month + 1
    return { "1M": 1, "3M": 3, "6M": 6, "1Y": 12 }[range]
  }, [range, currentRef.month])

  const startRef = useMemo(
    () => addMonths(anchor, -(rangeMonths - 1)),
    [anchor, rangeMonths],
  )

  const isCurrent =
    anchor.year === currentRef.year && anchor.month === currentRef.month
  const goPrev = () => setAnchor((m) => addMonths(m, -1))
  const goNext = () => setAnchor((m) => (isCurrent ? m : addMonths(m, 1)))
  const selectRange = (key: RangeKey) => {
    setRange(key)
    setAnchor(currentRef)
  }

  const monthLabel = (m: MonthRef) =>
    new Date(m.year, m.month, 1).toLocaleDateString("es-MX", { month: "short" })

  const windowLabel = useMemo(() => {
    if (rangeMonths === 1)
      return new Date(anchor.year, anchor.month, 1)
        .toLocaleDateString("es-MX", { month: "long", year: "numeric" })
        .replace(/^./, (c) => c.toUpperCase())
    if (startRef.year === anchor.year)
      return `${monthLabel(startRef)} – ${monthLabel(anchor)} ${anchor.year}`
    return `${monthLabel(startRef)} ${String(startRef.year).slice(2)} – ${monthLabel(anchor)} ${String(anchor.year).slice(2)}`
  }, [rangeMonths, startRef, anchor])

  useEffect(() => {
    let cancelled = false
    fetchBudgetSummary(monthPrefix(anchor))
      .then((b) => {
        if (!cancelled) setBudgetRule(b.rule)
      })
      .catch(() => {
        if (!cancelled) showToast("Error al cargar presupuesto", "error")
      })
    return () => {
      cancelled = true
    }
  }, [anchor, refreshKey, showToast])

  const budgetRows = useMemo(() => {
    if (budgetRule.length === 0) return []
    if (rangeMonths <= 1) return budgetRule
    const fromPrefix = monthPrefix(startRef)
    const toPrefix = monthPrefix(anchor)
    const spentByType = new Map<string, number>()
    for (const t of txns) {
      if (!t.date) continue
      const prefix = t.date.slice(0, 7)
      if (prefix < fromPrefix || prefix > toPrefix) continue
      if (!t.budget_type) continue
      const isSaveAllocation =
        (t.type === "income" || t.type === "transfer") &&
        t.budget_type === "save"
      if (t.type !== "expense" && !isSaveAllocation) continue
      spentByType.set(
        t.budget_type,
        (spentByType.get(t.budget_type) || 0) + Number(t.amount),
      )
    }
    return budgetRule.map((r) => {
      const spent = Math.round((spentByType.get(r.budgetType) || 0) * 100) / 100
      const target = Math.round(r.target * rangeMonths * 100) / 100
      return {
        ...r,
        spent,
        target,
        remaining: Math.round((target - spent) * 100) / 100,
      }
    })
  }, [budgetRule, txns, rangeMonths, startRef, anchor])

  const catData = useMemo(
    () => categorySpendInRange(txns, startRef, anchor),
    [txns, startRef, anchor],
  )
  const flowData = useMemo(
    () => cashFlowRange(txns, anchor, rangeMonths),
    [txns, anchor, rangeMonths],
  )
  const theoData = useMemo(
    () => interestChartDataRange(txns, anchor, rangeMonths),
    [txns, anchor, rangeMonths],
  )
  const theoMonthTotal = theoData.reduce((s, d) => s + d.valor, 0)
  const assetTxns = useMemo(() => {
    const toPrefix = monthPrefix(anchor)
    return txns.filter((t) => !t.date || t.date.slice(0, 7) <= toPrefix)
  }, [txns, anchor])
  const assetData = useMemo(
    () =>
      assetDistribution({
        accounts,
        txns: assetTxns,
        investments,
        receivables,
      }),
    [accounts, assetTxns, investments, receivables],
  )

  const reminders = useMemo(
    () =>
      [
        ...creditReminders(accounts, txns),
        ...recurringReminders(recurring, txns),
        ...debtReminders(debts),
        ...interestReminders(accounts, txns),
      ]
        .sort((a, b) => a.days - b.days)
        .slice(0, 6),
    [accounts, txns, recurring, debts],
  )

  const investGain = useMemo(() => {
    const cost = investments.reduce(
      (s, i) => s + Number(i.units) * Number(i.average_cost),
      0,
    )
    const gain = totals.investmentValue - cost
    const pct = cost > 0 ? (gain / cost) * 100 : 0
    return { gain, pct }
  }, [investments, totals.investmentValue])

  const recentTxs = useMemo<Transaction[]>(
    () =>
      [...txns]
        .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
        .slice(0, 5)
        .map((t) => {
          const isIncome = t.type === "income"
          const isTransfer = t.type === "transfer"
          const Icon =
            CAT_ICONS[t.category ?? ""] ?? banknoteIcons[t.type] ?? Tag
          const destId = t.destination_account_id ?? t.account_id
          return {
            id: t.id,
            icon: Icon,
            desc: t.description,
            cat:
              t.category ??
              (isIncome ? "Ingreso" : isTransfer ? "Transferencia" : "Gasto"),
            account: isTransfer
              ? `${accountName(t.account_id) || "?"} → ${accountName(destId) || "?"}`
              : accountName(destId) || "—",
            amount: Math.abs(Number(t.amount)),
            date: fmtDate(t.date),
            type: isIncome ? "income" : isTransfer ? "transfer" : "expense",
          } satisfies Transaction
        }),
    [txns, accountName],
  )

  const goalCards = useMemo<SavingsGoal[]>(
    () =>
      goals
        .slice()
        .sort((a, b) => a.priority - b.priority)
        .slice(0, 3)
        .map((g) => ({
          name: g.name,
          current: Number(g.current_amount),
          goal: Number(g.target_amount),
          color: GOAL_COLORS[g.id % GOAL_COLORS.length],
        })),
    [goals],
  )

  if (loading) {
    return (
      <div className="py-24 flex justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-purple-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 pb-6">
      <AIPrompt onOpenChat={onOpenChat} />

      {error && (
        <p className="text-xs" style={{ color: "#EF4444" }}>
          {error}
        </p>
      )}

      <div className="summary-cards grid gap-4">
        <SummaryCard
          title="Patrimonio Neto"
          value={fmt(totals.patrimonio)}
          sub="Activos menos pasivos"
          icon={Wallet}
          color="#7C3AED"
        />
        <SummaryCard
          title="Liquidez"
          value={fmt(totals.liquidity)}
          sub="Cuentas débito + efectivo + ahorro"
          icon={Banknote}
          color="#06D6A0"
        />
        <SummaryCard
          title="Deudas"
          value={fmt(totals.totalDebt)}
          sub="Tarjetas + préstamos"
          icon={CreditCard}
          color="#EF4444"
        />
        <SummaryCard
          title="Inversiones"
          value={fmt(totals.investmentValue)}
          sub={`${
            investGain.gain >= 0 ? "+" : ""
          }${investGain.pct.toFixed(1)}% vs costo de adquisición`}
          icon={TrendingUp}
          color="#F59E0B"
        />
      </div>

      <div
        className="glass rounded-2xl p-5"
        style={{
          border: "1px solid rgba(250,204,21,0.15)",
          background:
            "linear-gradient(135deg, rgba(250,204,21,0.05), rgba(255,255,255,0.02))",
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Bell size={16} style={{ color: "#FBBF24" }} />
          <h3 className="text-base font-semibold">Recordatorios</h3>
          <button
            onClick={() => onNavigate("recurring")}
            className="ml-auto text-xs font-medium flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors hover:bg-white/10"
            style={{ color: "#FBBF24", background: "rgba(250,204,21,0.08)" }}
          >
            Ver recurrentes <ChevronRight size={14} />
          </button>
        </div>
        {reminders.length === 0 ? (
          <p className="text-sm" style={{ color: "#6B6B85" }}>
            No hay eventos próximos.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {reminders.map((r) => {
              const isCredit = r.kind === "credit"
              const isDebt = r.kind === "debt"
              const isInterest = r.kind === "interest"
              const Icon = isCredit
                ? CreditCard
                : isInterest
                  ? TrendingUp
                  : isDebt
                    ? Wallet
                    : CalendarClock
              const color = isCredit
                ? "#EF4444"
                : isInterest
                  ? "#06D6A0"
                  : isDebt
                    ? "#A78BFA"
                    : "#F59E0B"
              return (
                <button
                  key={r.id}
                  onClick={() =>
                    onNavigate(
                      isCredit || isDebt
                        ? "debts"
                        : isInterest
                          ? "accounts"
                          : "recurring",
                    )
                  }
                  className="flex items-center gap-3 p-3 rounded-xl text-left transition-colors hover:bg-white/5"
                  style={{ background: "rgba(255,255,255,0.03)" }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${color}22` }}
                  >
                    <Icon size={16} style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.title}</p>
                    <p className="text-xs" style={{ color: "#6B6B85" }}>
                      {r.subtitle}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-mono font-semibold">
                      {fmt(r.amount)}
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: r.days <= 1 ? "#F87171" : "#FBBF24" }}
                    >
                      {daysLabel(r.days)}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div
        className="glass rounded-2xl p-5"
        style={{ border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold">
            {rangeMonths === 1
              ? "Presupuesto del Mes"
              : "Presupuesto por Periodo"}
          </h3>
          <div className="flex items-center gap-2">
            <span
              className="text-xs px-2 py-1 rounded-full font-medium"
              style={{ background: "rgba(124,58,237,0.15)", color: "#A78BFA" }}
            >
              {windowLabel}
            </span>
            <button
              onClick={() => onNavigate("budgets")}
              className="text-xs font-medium flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors hover:bg-white/10"
              style={{
                background: "rgba(255,255,255,0.06)",
                color: "#A0A0B8",
              }}
            >
              Ver todo <ChevronRight size={14} />
            </button>
          </div>
        </div>
        {budgetRows.length === 0 ? (
          <p className="text-sm" style={{ color: "#6B6B85" }}>
            Sin presupuesto configurado para este periodo.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {budgetRows.map((b) => (
              <div key={b.name}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span>{b.icon}</span>
                    <span className="text-sm font-medium">{b.name}</span>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded font-mono"
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        color: "#6B6B85",
                      }}
                    >
                      {b.percentage}%
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-mono font-semibold">
                      {fmt(b.spent)}
                    </span>
                    <span className="text-xs ml-1" style={{ color: "#6B6B85" }}>
                      / {fmt(b.target)}
                    </span>
                  </div>
                </div>
                <div
                  className="h-2 rounded-full overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.08)" }}
                >
                  <div
                    className="h-full rounded-full progress-bar transition-all"
                    style={{
                      width: `${
                        b.target > 0
                          ? Math.min(100, (b.spent / b.target) * 100)
                          : 0
                      }%`,
                      background: b.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div
        className="glass rounded-2xl p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        style={{ border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div className="flex items-center justify-between sm:justify-start gap-2">
          <div
            className="flex items-center gap-1 rounded-full"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            <button
              onClick={goPrev}
              className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
              style={{ color: "#A0A0B8" }}
              aria-label="Periodo anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <span
              className="text-xs px-1 font-medium min-w-[130px] text-center capitalize"
              style={{ color: "#A0A0B8" }}
            >
              {windowLabel}
            </span>
            <button
              onClick={goNext}
              disabled={isCurrent}
              className="p-1.5 rounded-full hover:bg-white/10 transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
              style={{ color: "#A0A0B8" }}
              aria-label="Periodo siguiente"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {([
            { key: "1M", label: "Este mes" },
            { key: "3M", label: "3 meses" },
            { key: "6M", label: "6 meses" },
            { key: "1Y", label: "1 año" },
            { key: "YTD", label: "Este año" },
          ] as { key: RangeKey; label: string }[]).map((o) => (
            <button
              key={o.key}
              onClick={() => selectRange(o.key)}
              className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
              style={
                range === o.key
                  ? { background: "rgba(124,58,237,0.25)", color: "#C4B5FD" }
                  : { background: "rgba(255,255,255,0.06)", color: "#A0A0B8" }
              }
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="charts-grid grid gap-4">
        <div
          className="glass rounded-2xl p-5"
          style={{ border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <h3 className="text-sm font-semibold mb-4">Gastos por Categoría</h3>
          <CategoryDonutChart data={catData} />
        </div>
        <div
          className="glass rounded-2xl p-5"
          style={{ border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <h3 className="text-sm font-semibold mb-4">Cash Flow Mensual</h3>
          <CashFlowBarChart data={flowData} />
        </div>
        <div
          className="glass rounded-2xl p-5"
          style={{ border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <h3 className="text-sm font-semibold mb-4">
            Distribución de Activos
          </h3>
          <AssetsDonutChart data={assetData} />
        </div>
        <div
          className="glass rounded-2xl p-5"
          style={{ border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Rendimiento Real</h3>
            <div className="flex items-center gap-2">
              <span
                className="text-xs px-2 py-1 rounded-full font-medium"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  color: "#A0A0B8",
                }}
              >
                {windowLabel}
              </span>
              <span
                className="text-xs px-2 py-1 rounded-full font-mono font-semibold"
                style={{
                  background: "rgba(245,158,11,0.15)",
                  color: "#F59E0B",
                }}
              >
                {fmt(theoMonthTotal)}
              </span>
            </div>
          </div>
          <TheoreticalInterestChart data={theoData} />
          <p className="text-[11px] mt-2" style={{ color: "#6B6B85" }}>
            Rendimiento real registrado manualmente por cuenta.
          </p>
        </div>
      </div>

      <div
        className="glass rounded-2xl p-5"
        style={{ border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold">Transacciones Recientes</h3>
          <button
            onClick={() => onNavigate("transactions")}
            className="text-xs font-medium flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors hover:bg-white/10"
            style={{ background: "rgba(255,255,255,0.06)", color: "#7C3AED" }}
          >
            Ver todas <ChevronRight size={14} />
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {recentTxs.length === 0 ? (
            <p className="text-sm" style={{ color: "#6B6B85" }}>
              No hay movimientos registrados todavía.
            </p>
          ) : (
            recentTxs.map((t) => <TransactionRow key={t.id} transaction={t} />)
          )}
        </div>
      </div>

      <div
        className="glass rounded-2xl p-5"
        style={{ border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold">Metas de Ahorro</h3>
          <button
            onClick={() => onNavigate("goals")}
            className="text-xs font-medium flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors hover:bg-white/10"
            style={{ background: "rgba(255,255,255,0.06)", color: "#A0A0B8" }}
          >
            Ver metas <ChevronRight size={14} />
          </button>
        </div>
        {goalCards.length === 0 ? (
          <p className="text-sm" style={{ color: "#6B6B85" }}>
            Sin metas de ahorro todavía.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            {goalCards.map((g) => (
              <SavingsGoalCard key={g.name} goal={g} />
            ))}
          </div>
        )}
      </div>

      <button
        onClick={() => setAddOpen(true)}
        className="btn-primary fixed bottom-20 sm:bottom-6 right-6 w-14 h-14 rounded-2xl flex items-center justify-center z-30 animate-pulse-glow"
      >
        <Plus size={24} color="white" />
      </button>

      <AddTransactionModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={() => {
          void load()
          setRefreshKey((k) => k + 1)
          showToast("Movimiento registrado exitosamente", "success")
        }}
      />
    </div>
  )
}
