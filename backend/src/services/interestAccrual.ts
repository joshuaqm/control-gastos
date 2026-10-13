import { AppDataSource } from '../config/database';
import { Account } from '../models/Account';
import { Transaction } from '../models/Transaction';
import { adjustAccountBalance } from './recalcBalance';
import { logger } from '../utils/logger';

export const THEORETICAL_NOTE = 'Rendimiento teórico semanal';
const REAL_NOTE = 'Rendimiento real mensual';

function endOfMonth(month: Date): Date {
  return new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Registers the real monthly interest of an account as a single income
 * transaction ("Rendimiento real de intereses") whose amount is the yield for
 * the period (it may be negative when the account loses value).
 *
 * The stored `initial_balance` is the account's current balance and is adjusted
 * incrementally by the yield, so the final balance equals the "saldo
 * actualizado" the user entered. Full recomputation is intentionally avoided
 * because it would overwrite the balance with the sum of transactions (i.e. the
 * yield itself), which is the bug this flow used to have.
 */
export async function adjustRealInterest(
  accountId: number,
  userId: number,
  amount: number,
  month?: Date
): Promise<{ transaction: Transaction; account: Account; theoreticalRemoved: number; balanceDelta: number }> {
  const accountRepo = AppDataSource.getRepository(Account);
  const transactionRepo = AppDataSource.getRepository(Transaction);

  const account = await accountRepo.findOne({ where: { id: accountId, userId } });
  if (!account) {
    throw new Error('Cuenta no encontrada');
  }
  if (account.type === 'credit') {
    throw new Error('No aplica a una tarjeta de crédito');
  }
  if (!Number.isFinite(amount) || amount === 0) {
    throw new Error('Ingresa un monto válido');
  }

  const monthRef = month ?? new Date();
  const monthEnd = endOfMonth(monthRef);

  // Clean up any legacy theoretical income transactions. Their amounts were
  // reflected in the stored balance, so reverse them before applying the yield.
  const allIncome = await transactionRepo.find({
    where: { account_id: accountId, userId, type: 'income' },
  });
  const theoreticalToRemove = allIncome.filter(t => t.notes === THEORETICAL_NOTE);
  let theoreticalSum = 0;
  if (theoreticalToRemove.length > 0) {
    theoreticalSum = theoreticalToRemove.reduce((s, t) => s + Number(t.amount), 0);
    await transactionRepo.remove(theoreticalToRemove);
  }

  account.last_interest_at = new Date(monthEnd.getFullYear(), monthEnd.getMonth(), monthEnd.getDate());
  await accountRepo.save(account);

  const transaction = transactionRepo.create({
    date: new Date(monthEnd.getFullYear(), monthEnd.getMonth(), Math.min(monthEnd.getDate(), 28)),
    description: 'Rendimiento real de intereses',
    amount,
    type: 'income',
    category: 'Intereses',
    budget_type: null,
    notes: REAL_NOTE,
    account_id: accountId,
    userId,
  });
  await transactionRepo.save(transaction);

  // Adjust the current balance by the yield (and reverse removed theoreticals)
  await adjustAccountBalance(accountId, userId, amount - theoreticalSum);
  const updated = await accountRepo.findOne({ where: { id: accountId, userId } });

  logger.info(`Real interest adjusted for account ${accountId}: +${amount} (removed ${theoreticalToRemove.length} theoretical)`);

  return {
    transaction,
    account: updated ?? account,
    theoreticalRemoved: theoreticalToRemove.length,
    balanceDelta: round2(amount),
  };
}