import { AppDataSource } from '../config/database';
import { Account } from '../models/Account';
import { Transaction } from '../models/Transaction';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Incrementally adjusts an account's stored balance by `delta` and persists it.
 * This preserves any manual adjustment the user made via the edit modal.
 */
export async function adjustAccountBalance(
  accountId: number,
  userId: number,
  delta: number,
): Promise<void> {
  const accountRepo = AppDataSource.getRepository(Account);
  const account = await accountRepo.findOne({ where: { id: accountId, userId } });
  if (!account) return;
  account.initial_balance = round2((Number(account.initial_balance) || 0) + delta);
  await accountRepo.save(account);
}

/**
 * Returns the balance delta that a transaction produces on an account.
 */
function txnDelta(t: Transaction, accountId: number): number {
  if (t.account_id === accountId) {
    return Number(t.amount) * (t.type === 'income' ? 1 : -1);
  }
  if (t.destination_account_id === accountId) {
    return Number(t.amount);
  }
  return 0;
}

/**
 * After a transaction is created, adjusts the balances of affected accounts.
 */
export async function applyCreate(
  userId: number,
  txn: Transaction,
): Promise<void> {
  if (txn.account_id != null) {
    await adjustAccountBalance(txn.account_id, userId, txnDelta(txn, txn.account_id));
  }
  if (txn.destination_account_id != null && txn.destination_account_id !== txn.account_id) {
    await adjustAccountBalance(txn.destination_account_id, userId, txnDelta(txn, txn.destination_account_id));
  }
}

/**
 * After a transaction is updated, reverses the old effect and applies the new one.
 */
export async function applyUpdate(
  userId: number,
  oldTxn: Transaction,
  newTxn: Transaction,
): Promise<void> {
  const affectedIds = new Set<number | null>([
    oldTxn.account_id,
    oldTxn.destination_account_id,
    newTxn.account_id,
    newTxn.destination_account_id,
  ]);

  // Reverse old, apply new per account
  for (const accId of affectedIds) {
    if (accId == null) continue;
    const oldDelta = txnDelta(oldTxn, accId);
    const newDelta = txnDelta(newTxn, accId);
    const net = newDelta - oldDelta;
    if (net !== 0) {
      await adjustAccountBalance(accId, userId, net);
    }
  }
}

/**
 * After a transaction is deleted, reverses its effect on affected accounts.
 */
export async function applyDelete(
  userId: number,
  txn: Transaction,
): Promise<void> {
  if (txn.account_id != null) {
    await adjustAccountBalance(txn.account_id, userId, -txnDelta(txn, txn.account_id));
  }
  if (txn.destination_account_id != null && txn.destination_account_id !== txn.account_id) {
    await adjustAccountBalance(txn.destination_account_id, userId, -txnDelta(txn, txn.destination_account_id));
  }
}

/**
 * Full recalculation from scratch. Used only for the account-edit endpoint
 * when the user manually sets a new balance — in that case the stored value
 * is the source of truth and no transaction recalculation is needed.
 */
export async function recalcAccountBalance(
  accountId: number,
  userId: number,
): Promise<number> {
  const accountRepo = AppDataSource.getRepository(Account);
  const transactionRepo = AppDataSource.getRepository(Transaction);

  const account = await accountRepo.findOne({ where: { id: accountId, userId } });
  if (!account) return 0;

  const txns = await transactionRepo.find({
    where: [
      { account_id: accountId, userId },
      { destination_account_id: accountId, userId },
    ],
  });

  let balance = 0;
  for (const t of txns) {
    if (t.account_id === accountId) {
      balance += Number(t.amount) * (t.type === 'income' ? 1 : -1);
    } else if (t.destination_account_id === accountId) {
      balance += Number(t.amount);
    }
  }

  account.initial_balance = round2(balance);
  await accountRepo.save(account);
  return account.initial_balance;
}
