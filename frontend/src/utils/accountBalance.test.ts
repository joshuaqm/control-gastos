import { describe, it, expect } from "vitest"
import {
  accountBalance,
  creditUsed,
  msiOutstanding,
  msiTxnsNet,
  cardUsed,
} from "./accountBalance"
import type { ApiAccount } from "@/api/accounts"
import type { ApiTransaction } from "@/api/transactions"
import type { ApiInstallment } from "@/api/installments"

const account = { id: 1, initial_balance: 10000 } as ApiAccount

const txn = (partial: Partial<ApiTransaction>): ApiTransaction =>
  ({
    id: Math.random(),
    date: "2026-08-01",
    description: "",
    amount: 0,
    type: "expense",
    category: "",
    budget_type: null,
    account_id: null,
    destination_account_id: null,
    userId: 1,
    ...partial,
  }) as ApiTransaction

describe("accountBalance", () => {
  it("starts from the initial balance with no transactions", () => {
    expect(accountBalance(account, [])).toBe(10000)
  })

  it("adds income and subtracts expenses", () => {
    const txns = [
      txn({ type: "income", amount: 500, account_id: 1 }),
      txn({ type: "expense", amount: 300, account_id: 1 }),
      txn({ type: "debt_payment", amount: 200, account_id: 1 }),
    ]
    // 10000 + 500 - 300 - 200 = 10000
    expect(accountBalance(account, txns)).toBe(10000)
  })

  it("adds incoming transfers via destination_account_id", () => {
    const txns = [
      txn({ type: "transfer", amount: 150, destination_account_id: 1 }),
    ]
    expect(accountBalance(account, txns)).toBe(10150)
  })

  it("ignores transactions of other accounts", () => {
    const txns = [txn({ type: "expense", amount: 9999, account_id: 2 })]
    expect(accountBalance(account, txns)).toBe(10000)
  })

  it("rounds to two decimals", () => {
    const txns = [txn({ type: "income", amount: 33.33, account_id: 1 })]
    expect(accountBalance(account, txns)).toBe(10033.33)
  })
})

describe("creditUsed", () => {
  it("accumulates expenses and outbound transfers", () => {
    const txns = [
      txn({ type: "expense", amount: 100, account_id: 4 }),
      txn({ type: "transfer", amount: 50, account_id: 4 }),
      txn({ type: "income", amount: 30, account_id: 4 }),
    ]
    expect(creditUsed(txns, 4)).toBe(120)
  })

  it("subtracts payments made to the card (destination)", () => {
    const txns = [
      txn({ type: "expense", amount: 100, account_id: 4 }),
      txn({ type: "transfer", amount: 100, destination_account_id: 4 }),
    ]
    expect(creditUsed(txns, 4)).toBe(0)
  })

  it("returns zero for unrelated cards", () => {
    const txns = [txn({ type: "expense", amount: 999, account_id: 9 })]
    expect(creditUsed(txns, 4)).toBe(0)
  })
})

describe("msiOutstanding", () => {
  const inst = (partial: Partial<ApiInstallment>): ApiInstallment =>
    ({
      id: 1,
      account_id: 4,
      status: "active",
      months_total: 12,
      months_paid: 2,
      monthly_amount: 500,
      ...partial,
    }) as ApiInstallment

  it("sums the remaining months of active installments", () => {
    expect(msiOutstanding([inst({ id: 1 })], 4)).toBe(500 * 10)
  })

  it("counts only installments of the given account and active status", () => {
    const others = [
      inst({ id: 2, account_id: 7, months_paid: 11 }),
      inst({ id: 3, account_id: 4, status: "paid" }),
    ]
    expect(msiOutstanding([inst({ id: 1 }), ...others], 4)).toBe(500 * 10)
  })
})

describe("msiTxnsNet", () => {
  it("detects MSI-related transactions (category or description)", () => {
    const txns = [
      txn({ category: "Compras a meses", amount: 400, account_id: 4 }),
      txn({
        description: "Celular (MSI)",
        amount: 100,
        destination_account_id: 4,
      }),
    ]
    expect(msiTxnsNet(txns, 4)).toBe(300)
  })

  it("ignores non-MSI transactions", () => {
    const txns = [
      txn({ category: "Comida", amount: 400, account_id: 4 }),
      txn({ description: "Renta", amount: 100, destination_account_id: 4 }),
    ]
    expect(msiTxnsNet(txns, 4)).toBe(0)
  })
})

describe("cardUsed", () => {
  it("combines transaction usage with MSI outstanding without double counting", () => {
    const txns = [
      txn({ type: "expense", amount: 1000, account_id: 4 }),
      txn({ category: "Compras a meses", amount: 400, account_id: 4 }),
    ]
    const installs = [
      {
        id: 1,
        account_id: 4,
        status: "active",
        months_total: 12,
        months_paid: 2,
        monthly_amount: 500,
      } as ApiInstallment,
    ]
    // creditUsed = 1000 + 400 = 1400; msiOutstanding = 500*10 = 5000; net includes +400
    // diff = 5000 - 400 = 4600 -> total = 6000
    expect(cardUsed(txns, installs, 4)).toBe(1000 + 400 + 4600)
  })
})
