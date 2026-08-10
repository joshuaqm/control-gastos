import type { ApiAccount } from "@/api/accounts"
import type { ApiTransaction } from "@/api/transactions"
import type { ApiInvestment } from "@/api/investments"
import type { ApiInstallment } from "@/api/installments"
import type { ApiDebt } from "@/api/debts"
import type { ApiReceivable } from "@/api/receivables"
import type { ApiRecurring } from "@/api/recurring"
import type { ApiGoal } from "@/api/goals"
import { accountBalance, cardUsed } from "./accountBalance"

export const THEORETICAL_NOTE = "Rendimiento teórico semanal"
export const REAL_NOTE = "Rendimiento real mensual"

export const MONTHS_SHORT = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
]
export const MONTHS_FULL = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
]

export const CATEGORY_COLORS = [
  "#7C3AED",
  "#06D6A0",
  "#F59E0B",
  "#3B82F6",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
  "#F97316",
  "#6366F1",
]

const DAY_MS = 86400000

export interface Totals {
  liquidity: number
  cashAssets: number
  investmentValue: number
  receivablesPending: number
  totalCardDebt: number
  totalOtherDebt: number
  totalDebt: number
  patrimonio: number
}

export interface ChartDatum {
  month: string
  valor: number
  costo?: number
  isReal?: boolean
}

export interface CashFlowPoint {
  month: string
  ingresos: number
  gastos: number
}

export interface DonutDatum {
  name: string
  value: number
  color: string
}

export interface Reminder {
  id: string
  kind: "credit" | "recurring" | "interest"
  title: string
  subtitle: string
  amount: number
  days: number
}

export interface DashboardInput {
  accounts: ApiAccount[]
  txns: ApiTransaction[]
  investments: ApiInvestment[]
  installments: ApiInstallment[]
  debts: ApiDebt[]
  receivables: ApiReceivable[]
  recurring: ApiRecurring[]
  goals: ApiGoal[]
}

const toDay = (date: string | Date): Date => {
  const d = new Date(date)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

const dayOfMonthDate = (year: number, month: number, day: number): Date => {
  const last = new Date(year, month + 1, 0).getDate()
  return new Date(year, month, Math.min(day, last))
}

export const daysUntil = (date: string | Date, from = new Date()): number => {
  const d = toDay(date)
  const f = toDay(from)
  return Math.round((d.getTime() - f.getTime()) / DAY_MS)
}

export function creditUsed(txns: ApiTransaction[], accountId: number): number {
  return txns.reduce((sum, t) => {
    if (t.account_id === accountId) {
      if (t.type === "expense" || t.type === "transfer")
        return sum + Number(t.amount)
      if (t.type === "income") return sum - Number(t.amount)
    }
    if (t.destination_account_id === accountId) return sum - Number(t.amount)
    return sum
  }, 0)
}

const isTheoretical = (t: ApiTransaction): boolean =>
  t.type === "income" &&
  t.category === "Intereses" &&
  t.notes === THEORETICAL_NOTE

export function totalCardDebtFor(
  input: Pick<DashboardInput, "accounts" | "txns" | "installments">,
): number {
  const totalCardDebt = input.accounts
    .filter((a) => a.type === "credit")
    .reduce((sum, a) => sum + cardUsed(input.txns, input.installments, a.id), 0)
  return Math.max(0, totalCardDebt)
}

export function computeTotals(input: DashboardInput): Totals {
  const { accounts, txns, investments, installments, debts, receivables } =
    input

  const cashAccounts = accounts.filter((a) => a.type !== "credit")

  const cashAssets = cashAccounts.reduce(
    (s, a) => s + accountBalance(a, txns),
    0,
  )
  const liquidity = accounts
    .filter(
      (a) => a.type === "debit" || a.type === "cash" || a.type === "savings",
    )
    .reduce((s, a) => s + accountBalance(a, txns), 0)

  const investmentValue = investments.reduce(
    (s, i) =>
      s +
      Number(i.units) *
        (i.current_price != null
          ? Number(i.current_price)
          : Number(i.average_cost)),
    0,
  )

  const receivablesPending = receivables.reduce(
    (s, r) =>
      s + Math.max(0, Number(r.original_amount) - Number(r.collected_amount)),
    0,
  )

  const totalCardDebt = Math.max(
    0,
    totalCardDebtFor({ accounts, txns, installments }),
  )

  const totalOtherDebt = debts
    .filter((d) => d.type !== "credit_card")
    .reduce(
      (s, d) =>
        s + Math.max(0, Number(d.original_amount) - Number(d.paid_amount)),
      0,
    )

  const totalDebt = totalCardDebt + totalOtherDebt
  const patrimonio =
    cashAssets + investmentValue + receivablesPending - totalDebt

  return {
    liquidity,
    cashAssets,
    investmentValue,
    receivablesPending,
    totalCardDebt,
    totalOtherDebt,
    totalDebt,
    patrimonio,
  }
}

export function categorySpend(
  txns: ApiTransaction[],
  year: number,
  month: number,
): DonutDatum[] {
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`
  const map = new Map<string, number>()
  for (const t of txns) {
    if (!t.date || t.date.slice(0, 7) !== prefix) continue
    if (t.type !== "expense" && t.type !== "debt_payment") continue
    const cat = t.category || "Sin categoría"
    map.set(cat, (map.get(cat) || 0) + Number(t.amount))
  }
  const sorted = [...map.entries()].sort((a, b) => b[1] - a[1])
  return sorted.map(([name, value], i) => ({
    name,
    value: Math.round(value * 100) / 100,
    color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
  }))
}

export function cashFlow(
  txns: ApiTransaction[],
  monthsBack = 6,
): CashFlowPoint[] {
  const result: CashFlowPoint[] = []
  const now = new Date()
  for (let m = monthsBack - 1; m >= 0; m--) {
    const d = new Date(now.getFullYear(), now.getMonth() - m, 1)
    const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    let ingresos = 0
    let gastos = 0
    for (const t of txns) {
      if (!t.date || t.date.slice(0, 7) !== prefix) continue
      if (isTheoretical(t)) continue
      if (t.type === "income" || t.type === "receivable")
        ingresos += Number(t.amount)
      if (t.type === "expense" || t.type === "debt_payment")
        gastos += Number(t.amount)
    }
    result.push({ month: MONTHS_SHORT[d.getMonth()], ingresos, gastos })
  }
  return result
}

const isRealInterest = (t: ApiTransaction): boolean =>
  t.type === "income" && t.category === "Intereses" && t.notes === REAL_NOTE

export function theoreticalInterestWeeks(
  txns: ApiTransaction[],
  year: number,
  month: number,
): ChartDatum[] {
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`
  const byWeek = new Map<string, number>()
  for (const t of txns) {
    if (!isTheoretical(t) || !t.date || t.date.slice(0, 7) !== prefix) continue
    const day = Number(t.date.slice(8, 10))
    if (Number.isNaN(day)) continue
    const week = `Sem ${Math.ceil(day / 7)}`
    byWeek.set(week, (byWeek.get(week) || 0) + Number(t.amount))
  }
  const totalWeeks = Math.ceil(new Date(year, month + 1, 0).getDate() / 7)
  const result: ChartDatum[] = []
  for (let w = 1; w <= totalWeeks; w++) {
    result.push({
      month: `Sem ${w}`,
      valor: Math.round((byWeek.get(`Sem ${w}`) || 0) * 100) / 100,
    })
  }
  return result
}

export function interestChartData(
  txns: ApiTransaction[],
  year: number,
  month: number,
): ChartDatum[] {
  const weekly = theoreticalInterestWeeks(txns, year, month)
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`
  const real = txns
    .filter((t) => isRealInterest(t) && t.date && t.date.slice(0, 7) === prefix)
    .reduce((s, t) => s + Number(t.amount), 0)
  if (real > 0) {
    weekly.push({
      month: "Real",
      valor: Math.round(real * 100) / 100,
      isReal: true,
    })
  }
  return weekly
}

export function assetDistribution(
  input: Pick<DashboardInput, "accounts" | "txns" | "investments" | "receivables">,
): DonutDatum[] {
  const result: DonutDatum[] = []
  const liquid = input.accounts
    .filter(
      (a) => a.type === "debit" || a.type === "cash" || a.type === "savings",
    )
    .reduce((s, a) => s + accountBalance(a, input.txns), 0)
  if (liquid > 0)
    result.push({ name: "Líquido", value: liquid, color: "#06D6A0" })

  const investAccounts = input.accounts
    .filter((a) => a.type === "investment")
    .reduce((s, a) => s + accountBalance(a, input.txns), 0)
  if (investAccounts > 0)
    result.push({
      name: "Cuentas inversión",
      value: investAccounts,
      color: "#3B82F6",
    })

  const portfolio = input.investments.reduce(
    (s, i) =>
      s +
      Number(i.units) *
        (i.current_price != null
          ? Number(i.current_price)
          : Number(i.average_cost)),
    0,
  )
  if (portfolio > 0)
    result.push({ name: "Portafolio", value: portfolio, color: "#7C3AED" })

  const porCobrar = input.receivables.reduce(
    (s, r) =>
      s + Math.max(0, Number(r.original_amount) - Number(r.collected_amount)),
    0,
  )
  if (porCobrar > 0)
    result.push({ name: "Por cobrar", value: porCobrar, color: "#F59E0B" })

  return result
}

export function creditReminders(
  accounts: ApiAccount[],
  txns: ApiTransaction[],
  today = new Date(),
): Reminder[] {
  const reminders: Reminder[] = []
  for (const a of accounts) {
    if (a.type !== "credit" || !a.is_active || a.payment_due_day == null)
      continue
    if (creditUsed(txns, a.id) <= 0) continue

    const due = dayOfMonthDate(
      today.getFullYear(),
      today.getMonth(),
      a.payment_due_day,
    )
    if (due < toDay(today)) {
      due.setMonth(due.getMonth() + 1)
    }
    const days = Math.round((due.getTime() - toDay(today).getTime()) / DAY_MS)
    if (days > 3) continue

    // paid when a transfer to the card (or debt_payment on it) exists after the cycle cutoff
    const cutoff = dayOfMonthDate(
      due.getFullYear(),
      due.getMonth(),
      a.cutoff_day ?? a.payment_due_day,
    )
    if (a.cutoff_day != null && a.cutoff_day > a.payment_due_day) {
      cutoff.setMonth(cutoff.getMonth() - 1)
    }
    const paidThisCycle = txns.some((t) => {
      if (!t.date) return false
      const td = toDay(t.date)
      if (td < cutoff) return false
      const isPay =
        (t.destination_account_id === a.id && t.type === "transfer") ||
        (t.account_id === a.id && t.type === "debt_payment")
      return isPay
    })
    if (paidThisCycle) continue

    reminders.push({
      id: `credit-${a.id}`,
      kind: "credit",
      title: `Pago tarjeta ${a.name}`,
      subtitle: `Corte día ${a.cutoff_day ?? "—"} · pago día ${a.payment_due_day}`,
      amount: creditUsed(txns, a.id),
      days,
    })
  }
  return reminders.sort((x, y) => x.days - y.days)
}

export function recurringReminders(
  recurring: ApiRecurring[],
  txns: ApiTransaction[],
  today = new Date(),
): Reminder[] {
  const reminders: Reminder[] = []
  for (const r of recurring) {
    if (!r.is_active || !r.next_date) continue
    const days = daysUntil(r.next_date, today)
    if (days > 3) continue
    const alreadyPaid = txns.some(
      (t) =>
        t.recurring_id === r.id &&
        t.date &&
        t.date.slice(0, 10) === r.next_date.slice(0, 10),
    )
    if (alreadyPaid) continue
    reminders.push({
      id: `recurring-${r.id}`,
      kind: "recurring",
      title: r.name,
      subtitle: r.category || "Suscripción",
      amount: Number(r.amount),
      days,
    })
  }
  return reminders.sort((x, y) => x.days - y.days)
}

/**
 * Monthly reminder on the first days of each month to register the real
 * interest (rendimiento real) of accounts with an interest rate. Shows the
 * previous month's theoretical total as reference.
 */
export function interestReminders(
  accounts: ApiAccount[],
  txns: ApiTransaction[],
  today = new Date(),
): Reminder[] {
  const day = today.getDate()
  if (day > 3) return []

  const rateAccounts = accounts.filter(
    (a) =>
      a.is_active &&
      a.type !== "credit" &&
      a.interest_rate != null &&
      Number(a.interest_rate) > 0,
  )
  if (rateAccounts.length === 0) return []

  const prev = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const prevPrefix = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`

  const alreadyRecorded = txns.some(
    (t) => isRealInterest(t) && t.date && t.date.slice(0, 7) === prevPrefix,
  )
  if (alreadyRecorded) return []

  const theoreticalRef = txns
    .filter((t) => isTheoretical(t) && t.date && t.date.slice(0, 7) === prevPrefix)
    .reduce((s, t) => s + Number(t.amount), 0)

  return [
    {
      id: "interest-real",
      kind: "interest",
      title: "Registrar rendimientos reales",
      subtitle: `${rateAccounts.length} cuenta(s) con tasa · mes anterior`,
      amount: Math.round(theoreticalRef * 100) / 100,
      days: day - 1,
    },
  ]
}
