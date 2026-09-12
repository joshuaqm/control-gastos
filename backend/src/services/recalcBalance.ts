import { AppDataSource } from '../config/database';
import { Account } from '../models/Account';
import { Transaction } from '../models/Transaction';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Recalculates an account's balance from its stored initial_balance plus all
 * transactions that touch it, then persists the result. This keeps the
 * `initial_balance` column in sync as a "current balance" field.
 *
 * Returns the new balance.
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

/**
 * Recalculates balances for two accounts at once (useful for transfers).
 * Deduplicates if both IDs are the same.
 */
export async function recalcTwoAccountBalances(
  userId: number,
  accountId1: number,
  accountId2?: number | null,
): Promise<void> {
  await recalcAccountBalance(accountId1, userId);
  if (accountId2 != null && accountId2 !== accountId1) {
    await recalcAccountBalance(accountId2, userId);
  }
}
