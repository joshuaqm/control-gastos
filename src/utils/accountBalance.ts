import type { ApiAccount } from "@/api/accounts"
import type { ApiTransaction } from "@/api/transactions"
import type { ApiInstallment } from "@/api/installments"

/**
 * Computes the current balance of a non-credit account from its initial
 * balance plus all movements: incomes add, everything else on the account
 * (expenses, transfers out, debt/lending payments) subtracts, and incoming
 * transfers (destination_account_id) add.
 */
export function accountBalance(
  account: Pick<ApiAccount, "id" | "initial_balance">,
  txns: ApiTransaction[],
): number {
  let balance = Number(account.initial_balance) || 0
  for (const t of txns) {
    if (t.account_id === account.id) {
      if (t.type === "income") balance += Number(t.amount)
      else balance -= Number(t.amount)
    } else if (t.destination_account_id === account.id) {
      balance += Number(t.amount)
    }
  }
  return Math.round(balance * 100) / 100
}

/** Credit card usage (saldo utilizado) derived from transactions. */
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

/** True when a transaction belongs to the MSI flow created by the backend. */
function isMsiTransaction(t: ApiTransaction): boolean {
  return (
    t.category === "Compras a meses" ||
    (t.description ?? "").includes("(MSI)")
  )
}

/**
 * Net contribution of MSI transactions (purchase + monthly transfers into the
 * card) to the transaction-derived usage of a credit card.
 */
export function msiTxnsNet(txns: ApiTransaction[], accountId: number): number {
  let net = 0
  for (const t of txns) {
    if (!isMsiTransaction(t)) continue
    if (t.account_id === accountId) net += Number(t.amount)
    if (t.destination_account_id === accountId) net -= Number(t.amount)
  }
  return net
}

/** Outstanding MSI balance (months left x monthly) for a credit card. */
export function msiOutstanding(
  installments: ApiInstallment[],
  accountId: number,
): number {
  return installments
    .filter((i) => i.account_id === accountId && i.status === "active")
    .reduce(
      (sum, i) =>
        sum +
        Number(i.monthly_amount) *
          (Number(i.months_total) - Number(i.months_paid)),
      0,
    )
}

/**
 * Saldo utilizado of a credit card, combining transaction usage with any MSI
 * outstanding. MSI is only added when the installment balance exceeds what the
 * MSI transactions already reflect (avoids double counting in the normal flow
 * where the backend charges the full purchase as a transaction).
 */
export function cardUsed(
  txns: ApiTransaction[],
  installments: ApiInstallment[],
  accountId: number,
): number {
  const fromTxns = Math.max(0, creditUsed(txns, accountId))
  const msiDiff = msiOutstanding(installments, accountId) - msiTxnsNet(txns, accountId)
  return Math.round((fromTxns + Math.max(0, msiDiff)) * 100) / 100
}
