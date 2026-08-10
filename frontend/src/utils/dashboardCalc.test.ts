import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import type { ApiAccount } from "@/api/accounts"
import type { ApiTransaction } from "@/api/transactions"
import type { ApiInvestment } from "@/api/investments"
import type { ApiInstallment } from "@/api/installments"
import type { ApiDebt } from "@/api/debts"
import type { ApiReceivable } from "@/api/receivables"
import type { ApiRecurring } from "@/api/recurring"
import type { ApiGoal } from "@/api/goals"
import {
  computeTotals,
  categorySpend,
  cashFlow,
  totalCardDebtFor,
  creditReminders,
  debtReminders,
  recurringReminders,
  interestReminders,
  theoreticalInterestWeeks,
  interestChartData,
  assetDistribution,
  daysUntil,
  THEORETICAL_NOTE,
  REAL_NOTE,
} from "./dashboardCalc"

const account = (partial: Partial<ApiAccount> = {}): ApiAccount =>
  ({
    id: 1,
    name: "Cuenta",
    type: "debit",
    initial_balance: 0,
    credit_limit: null,
    interest_rate: null,
    last_interest_at: null,
    cutoff_day: null,
    payment_due_day: null,
    is_active: true,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    userId: 1,
    ...partial,
  }) as ApiAccount

const txn = (partial: Partial<ApiTransaction>): ApiTransaction =>
  ({
    id: 1,
    date: "2026-08-01",
    description: "",
    amount: 0,
    type: "expense",
    category: null,
    budget_type: null,
    account_id: null,
    destination_account_id: null,
    userId: 1,
    ...partial,
  }) as ApiTransaction

describe("computeTotals", () => {
  const input = {
    accounts: [
      account({ id: 1, type: "debit", initial_balance: 1000 }),
      account({ id: 2, type: "savings", initial_balance: 500 }),
      account({ id: 3, type: "credit", initial_balance: 0 }),
    ],
    txns: [
      txn({ type: "expense", amount: 200, account_id: 1 }),
      txn({ type: "expense", amount: 800, account_id: 3 }),
    ],
    investments: [
      {
        id: 1,
        name: "ETF",
        ticker: null,
        broker: null,
        type: "etf",
        units: 10,
        average_cost: 100,
        current_price: 120,
        purchase_date: null,
        last_updated: null,
        notes: null,
        created_at: "",
        updated_at: "",
        userId: 1,
      } as ApiInvestment,
    ],
    installments: [] as ApiInstallment[],
    debts: [] as ApiDebt[],
    receivables: [] as ApiReceivable[],
    recurring: [] as ApiRecurring[],
    goals: [] as ApiGoal[],
  }

  it("aggregates cash, investments, card and other debt", () => {
    const t = computeTotals(input)
    expect(t.cashAssets).toBe(1300)
    expect(t.liquidity).toBe(1300)
    expect(t.investmentValue).toBe(1200)
    expect(t.totalCardDebt).toBe(800)
    expect(t.totalOtherDebt).toBe(0)
    expect(t.totalDebt).toBe(800)
    expect(t.patrimonio).toBe(1300 + 1200 - 800)
  })
})

describe("categorySpend", () => {
  it("groups expenses of the month sorted desc", () => {
    const result = categorySpend(
      [
        txn({
          date: "2026-08-10",
          type: "expense",
          amount: 50,
          category: "Comida",
        }),
        txn({
          date: "2026-08-11",
          type: "expense",
          amount: 200,
          category: "Renta",
        }),
        txn({
          date: "2026-08-12",
          type: "expense",
          amount: 25,
          category: "Comida",
        }),
        txn({
          date: "2026-07-30",
          type: "expense",
          amount: 999,
          category: "Otro mes",
        }),
        txn({
          date: "2026-08-13",
          type: "income",
          amount: 500,
          category: "Nómina",
        }),
      ],
      2026,
      7,
    )
    expect(result).toEqual([
      { name: "Renta", value: 200, color: "#7C3AED" },
      { name: "Comida", value: 75, color: "#06D6A0" },
    ])
  })
})

describe("cashFlow", () => {
  it("marks the current month prefix for ingresos/gastos", () => {
    const now = new Date()
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
    const result = cashFlow(
      [
        txn({ date: `${month}-05`, type: "income", amount: 100 }),
        txn({ date: `${month}-06`, type: "expense", amount: 40 }),
        txn({ date: `${month}-07`, type: "debt_payment", amount: 60 }),
        txn({
          type: "income",
          amount: 10,
          category: "Intereses",
          notes: THEORETICAL_NOTE,
          date: `${month}-08`,
        }),
      ],
      1,
    )
    const last = result[result.length - 1]
    expect(last.ingresos).toBe(100)
    expect(last.gastos).toBe(100)
  })
})

describe("totalCardDebtFor", () => {
  it("sums card usage across credit accounts and floors at zero", () => {
    const accounts = [
      account({ id: 1, type: "credit", initial_balance: 0 }),
      account({ id: 2, type: "credit", initial_balance: 0 }),
    ]
    const txns = [
      txn({ type: "expense", amount: 300, account_id: 1 }),
      txn({ type: "transfer", amount: 100, account_id: 2 }),
    ]
    expect(totalCardDebtFor({ accounts, txns, installments: [] })).toBe(400)
  })
})

describe("theoreticalInterestWeeks / interestChartData", () => {
  const txns = [
    txn({
      type: "income",
      category: "Intereses",
      notes: THEORETICAL_NOTE,
      amount: 10,
      date: "2026-08-01",
    }),
    txn({
      type: "income",
      category: "Intereses",
      notes: THEORETICAL_NOTE,
      amount: 10,
      date: "2026-08-15",
    }),
  ]
  it("buckets theoretical interest by week", () => {
    const weeks = theoreticalInterestWeeks(txns, 2026, 7)
    expect(weeks.length).toBe(5)
    expect(weeks[0].valor).toBe(10)
    expect(weeks[2].valor).toBe(10)
  })
  it("appends a real bar when a real interest txn exists", () => {
    const withReal = [
      ...txns,
      txn({
        type: "income",
        category: "Intereses",
        notes: REAL_NOTE,
        amount: 77,
        date: "2026-08-20",
      }),
    ]
    const data = interestChartData(withReal, 2026, 7)
    expect(data[data.length - 1]).toEqual({
      month: "Real",
      valor: 77,
      isReal: true,
    })
  })
})

describe("assetDistribution", () => {
  it("only includes slices with positive values", () => {
    const result = assetDistribution({
      accounts: [
        account({ id: 1, type: "debit", initial_balance: 100 }),
        account({ id: 2, type: "investment", initial_balance: 0 }),
      ],
      txns: [],
      investments: [
        {
          id: 1,
          units: 5,
          current_price: 10,
          average_cost: 8,
        } as ApiInvestment,
      ],
      receivables: [
        { original_amount: 50, collected_amount: 0 } as ApiReceivable,
      ],
    })
    const names = result.map((d) => d.name)
    expect(names).toContain("Líquido")
    expect(names).toContain("Portafolio")
    expect(names).toContain("Por cobrar")
    expect(names).not.toContain("Cuentas inversión")
  })
})

describe("reminders", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 15, 12, 0, 0))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it("creditReminders flags a due card payment within 3 days", () => {
    const accounts = [
      account({
        id: 4,
        type: "credit",
        is_active: true,
        cutoff_day: 10,
        payment_due_day: 16,
        name: "Banorte",
      }),
    ]
    const txns = [txn({ type: "expense", amount: 500, account_id: 4 })]
    const reminders = creditReminders(accounts, txns)
    expect(reminders).toHaveLength(1)
    expect(reminders[0].kind).toBe("credit")
    expect(reminders[0].days).toBe(1)
    expect(reminders[0].title).toContain("Banorte")
  })

  it("creditReminders skips cards with no usage", () => {
    const accounts = [
      account({ id: 4, type: "credit", is_active: true, payment_due_day: 16 }),
    ]
    expect(creditReminders(accounts, [])).toHaveLength(0)
  })

  it("debtReminders reminds about due debts not yet paid", () => {
    const debts = [
      {
        id: 1,
        name: "Préstamo",
        type: "loan",
        status: "open",
        original_amount: 1000,
        paid_amount: 0,
        due_date: "2026-08-17",
        creditor: "Banco",
      } as ApiDebt,
      {
        id: 2,
        name: "Pagada",
        type: "loan",
        status: "paid",
        original_amount: 1000,
        paid_amount: 1000,
        due_date: "2026-08-16",
        creditor: "Banco",
      } as ApiDebt,
    ]
    const reminders = debtReminders(debts)
    expect(reminders).toHaveLength(1)
    expect(reminders[0].id).toBe("debt-1")
  })

  it("recurringReminders lists upcoming subscriptions not yet paid", () => {
    const recurring = [
      {
        id: 1,
        name: "Netflix",
        amount: 200,
        is_active: true,
        next_date: "2026-08-18",
        category: "Suscripción",
      } as ApiRecurring,
      {
        id: 2,
        name: "Spotify",
        amount: 100,
        is_active: false,
        next_date: "2026-08-16",
        category: null,
      } as ApiRecurring,
    ]
    const reminders = recurringReminders(recurring, [])
    expect(reminders).toHaveLength(1)
    expect(reminders[0].title).toBe("Netflix")
  })

  it("interestReminders only appears in first days of the month", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 2))
    const early = interestReminders(
      [account({ is_active: true, interest_rate: 5 })],
      [],
    )
    expect(early).toHaveLength(1)
    expect(early[0].kind).toBe("interest")
    vi.setSystemTime(new Date(2026, 7, 15, 12))
    expect(
      interestReminders([account({ is_active: true, interest_rate: 5 })], []),
    ).toHaveLength(0)
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 15, 12))
  })

  it("daysUntil computes a positive day difference", () => {
    expect(daysUntil("2026-08-17", new Date(2026, 7, 15))).toBe(2)
  })
})
