import type { ApiAccount } from "@/api/accounts"
import type { ApiTransaction } from "@/api/transactions"
import type { ApiInvestment } from "@/api/investments"
import type { ApiInstallment } from "@/api/installments"
import type { ApiDebt } from "@/api/debts"
import type { ApiReceivable } from "@/api/receivables"
import type { ApiRecurring } from "@/api/recurring"
import type { ApiGoal } from "@/api/goals"
import { accountBalance, cardUsed } from "./accountBalance"

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
  kind: "credit" | "recurring" | "interest" | "debt"
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

export interface MonthRef {
  year: number
  month: number
}

export const monthPrefix = (m: MonthRef): string =>
  `${m.year}-${String(m.month + 1).padStart(2, "0")}`

export const addMonths = (m: MonthRef, delta: number): MonthRef => {
  const d = new Date(m.year, m.month + delta, 1)
  return { year: d.getFullYear(), month: d.getMonth() }
}

const toDay = (date: string | Date): Date => {
  const d = new Date(date)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

const dayOfMonthDate = (year: number, month: number, day: number): Date => {
  const last = new Date(year, month + 1, 0).getDate()
  return new Date(year, month, Math.min(day, last))
}

/** Most recent cutoff date on or before `date`. */
const nextCutoffOnOrAfter = (date: Date, cutoffDay: number): Date => {
  const cand = dayOfMonthDate(date.getFullYear(), date.getMonth(), cutoffDay)
  return cand >= date
    ? cand
    : dayOfMonthDate(date.getFullYear(), date.getMonth() + 1, cutoffDay)
}

/**
 * Payment due date for a statement that closes at `cutoff`. When the payment
 * day falls earlier than the cutoff day (e.g. corte 20, pago 3), the payment
 * is due the next month; otherwise it is due in the same month as the cutoff.
 */
const paymentDueForCutoff = (
  cutoff: Date,
  cutoffDay: number,
  dueDay: number,
): Date =>
  dueDay >= cutoffDay
    ? dayOfMonthDate(cutoff.getFullYear(), cutoff.getMonth(), dueDay)
    : dayOfMonthDate(cutoff.getFullYear(), cutoff.getMonth() + 1, dueDay)

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

const isRealInterest = (t: ApiTransaction): boolean =>
  t.type === "income" && t.category === "Intereses" && t.notes === REAL_NOTE

export function interestChartData(
  txns: ApiTransaction[],
  year: number,
  month: number,
): ChartDatum[] {
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`
  const byDay = new Map<string, number>()
  for (const t of txns) {
    if (!isRealInterest(t) || !t.date || t.date.slice(0, 7) !== prefix) continue
    const day = Number(t.date.slice(8, 10))
    if (Number.isNaN(day)) continue
    byDay.set(
      t.date.slice(0, 10),
      (byDay.get(t.date.slice(0, 10)) || 0) + Number(t.amount),
    )
  }
  const result: ChartDatum[] = []
  for (const [day, val] of [...byDay.entries()].sort()) {
    result.push({
      month: day,
      valor: Math.round(val * 100) / 100,
      isReal: true,
    })
  }
  return result
}

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
    .reduce((s, a) => s + accountBalance(a, txns), 0) -
    receivables.reduce(
      (s, r) => s + Math.max(0, Number(r.original_amount) - Number(r.collected_amount)),
      0,
    )

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
      if (t.type === "income" || t.type === "receivable")
        ingresos += Number(t.amount)
      if (t.type === "expense" || t.type === "debt_payment")
        gastos += Number(t.amount)
    }
    result.push({ month: MONTHS_SHORT[d.getMonth()], ingresos, gastos })
  }
  return result
}

export function categorySpendInRange(
  txns: ApiTransaction[],
  from: MonthRef,
  to: MonthRef,
): DonutDatum[] {
  const fromPrefix = monthPrefix(from)
  const toPrefix = monthPrefix(to)
  const map = new Map<string, number>()
  for (const t of txns) {
    if (!t.date) continue
    const prefix = t.date.slice(0, 7)
    if (prefix < fromPrefix || prefix > toPrefix) continue
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

export function cashFlowRange(
  txns: ApiTransaction[],
  anchor: MonthRef,
  months: number,
): CashFlowPoint[] {
  const result: CashFlowPoint[] = []
  const startRef = addMonths(anchor, -(months - 1))
  const spansYear = startRef.year !== anchor.year
  for (let i = months - 1; i >= 0; i--) {
    const m = addMonths(anchor, -i)
    const prefix = monthPrefix(m)
    let ingresos = 0
    let gastos = 0
    for (const t of txns) {
      if (!t.date || t.date.slice(0, 7) !== prefix) continue
      if (t.type === "income" || t.type === "receivable")
        ingresos += Number(t.amount)
      if (t.type === "expense" || t.type === "debt_payment")
        gastos += Number(t.amount)
    }
    result.push({
      month: spansYear
        ? `${MONTHS_SHORT[m.month]} ${String(m.year).slice(2)}`
        : MONTHS_SHORT[m.month],
      ingresos,
      gastos,
    })
  }
  return result
}

export function interestChartDataRange(
  txns: ApiTransaction[],
  anchor: MonthRef,
  months: number,
): ChartDatum[] {
  const toPrefix = monthPrefix(anchor)
  if (months <= 1) {
    const byDay = new Map<string, number>()
    for (const t of txns) {
      if (!isRealInterest(t) || !t.date) continue
      if (t.date.slice(0, 7) !== toPrefix) continue
      const day = Number(t.date.slice(8, 10))
      if (Number.isNaN(day)) continue
      byDay.set(
        t.date.slice(0, 10),
        (byDay.get(t.date.slice(0, 10)) || 0) + Number(t.amount),
      )
    }
    return [...byDay.entries()].sort().map(([day, val]) => ({
      month: day,
      valor: Math.round(val * 100) / 100,
      isReal: true,
    }))
  }
  const fromPrefix = monthPrefix(addMonths(anchor, -(months - 1)))
  const byMonth = new Map<string, number>()
  for (const t of txns) {
    if (!isRealInterest(t) || !t.date) continue
    const prefix = t.date.slice(0, 7)
    if (prefix < fromPrefix || prefix > toPrefix) continue
    byMonth.set(prefix, (byMonth.get(prefix) || 0) + Number(t.amount))
  }
  const result: ChartDatum[] = []
  const startRef = addMonths(anchor, -(months - 1))
  for (let i = 0; i < months; i++) {
    const m = addMonths(startRef, i)
    result.push({
      month: `${MONTHS_SHORT[m.month]} ${String(m.year).slice(2)}`,
      valor: Math.round((byMonth.get(monthPrefix(m)) || 0) * 100) / 100,
      isReal: true,
    })
  }
  return result
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

/**
 * Returns the date of the oldest charge on a credit card that is still
 * outstanding, applying payments FIFO (payments cover the oldest charges
 * first). Returns null when everything has been paid off.
 */
function oldestOutstandingDate(
  txns: ApiTransaction[],
  accountId: number,
): Date | null {
  const charges: { date: Date; remaining: number }[] = []
  const payments: { date: Date; amount: number }[] = []
  for (const t of txns) {
    if (!t.date) continue
    const d = toDay(t.date)
    if (t.account_id === accountId) {
      if (t.type === "expense" || t.type === "transfer")
        charges.push({ date: d, remaining: Number(t.amount) })
      else if (t.type === "income")
        payments.push({ date: d, amount: Number(t.amount) })
    } else if (t.destination_account_id === accountId && t.type === "transfer") {
      payments.push({ date: d, amount: Number(t.amount) })
    }
  }
  charges.sort((a, b) => a.date.getTime() - b.date.getTime())
  payments.sort((a, b) => a.date.getTime() - b.date.getTime())
  let ci = 0
  for (const p of payments) {
    let amount = p.amount
    while (ci < charges.length && amount > 0.005) {
      if (charges[ci].remaining <= 0.005) {
        ci += 1
        continue
      }
      const take = Math.min(charges[ci].remaining, amount)
      charges[ci].remaining -= take
      amount -= take
      if (charges[ci].remaining <= 0.005) ci += 1
    }
  }
  for (const c of charges) {
    if (c.remaining > 0.005) return c.date
  }
  return null
}

export function creditReminders(
  accounts: ApiAccount[],
  txns: ApiTransaction[],
  today = new Date(),
): Reminder[] {
  const reminders: Reminder[] = []
  const todayDay = toDay(today)
  for (const a of accounts) {
    if (a.type !== "credit" || !a.is_active || a.payment_due_day == null)
      continue
    if (creditUsed(txns, a.id) <= 0) continue

    const cutoffDay = a.cutoff_day ?? a.payment_due_day
    const dueDay = a.payment_due_day

    // The oldest charge that hasn't been paid off defines the billing cycle
    // the outstanding balance belongs to.
    const oldestDate = oldestOutstandingDate(txns, a.id)
    const refDate = oldestDate ?? todayDay

    const cutoff = nextCutoffOnOrAfter(refDate, cutoffDay)
    const due = paymentDueForCutoff(cutoff, cutoffDay, dueDay)

    // paid when a transfer to the card (or debt_payment on it) exists after the cycle cutoff
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

    const days = Math.round((due.getTime() - todayDay.getTime()) / DAY_MS)
    if (days > 3) continue

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

/**
 * Reminders for independent credits (debts with a due date) that are not fully
 * paid. Shows them from 3 days before the due date and keeps sending them as
 * long as there is a pending balance (no registered payment).
 */
export function debtReminders(
  debts: ApiDebt[],
  today = new Date(),
): Reminder[] {
  const reminders: Reminder[] = []
  for (const d of debts) {
    if (d.type === "credit_card") continue
    if (d.status === "paid") continue
    if (!d.due_date) continue
    const pending =
      Math.round((Number(d.original_amount) - Number(d.paid_amount)) * 100) /
      100
    if (pending <= 0) continue

    const days = daysUntil(d.due_date, today)
    if (days > 3) continue

    reminders.push({
      id: `debt-${d.id}`,
      kind: "debt",
      title: `Pago ${d.name}`,
      subtitle: `${
        d.creditor === "—" ? "Deuda independiente" : d.creditor
      } · vence ${String(d.due_date).slice(0, 10)}`,
      amount: pending,
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
 * interest (rendimiento real) of accounts with an interest rate.
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

  return [
    {
      id: "interest-real",
      kind: "interest",
      title: "Registrar rendimientos reales",
      subtitle: `${rateAccounts.length} cuenta(s) con tasa · mes anterior`,
      amount: 0,
      days: day - 1,
    },
  ]
}
