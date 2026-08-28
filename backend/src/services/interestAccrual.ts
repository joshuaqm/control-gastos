import { AppDataSource } from '../config/database';
import { Account } from '../models/Account';
import { Transaction } from '../models/Transaction';
import { recalcAccountBalance } from './recalcBalance';
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
 * transaction ("Rendimiento real de intereses"). The balance is derived from
 * `initial_balance` plus the account's transactions, so the income transaction
 * accounts for the yield exactly once (no theoretical accrual involved).
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
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Ingresa un monto válido');
  }

  const monthRef = month ?? new Date();
  const monthEnd = endOfMonth(monthRef);

  // Clean up any legacy theoretical income transactions. Removing them and
  // recalculating the balance is sufficient — no manual initial_balance
  // adjustment needed since recalcAccountBalance derives from transactions.
  const allIncome = await transactionRepo.find({
    where: { account_id: accountId, userId, type: 'income' },
  });
  const theoreticalToRemove = allIncome.filter(t => t.notes === THEORETICAL_NOTE);
  if (theoreticalToRemove.length > 0) {
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

  // Recalculate balance to include the new interest income
  await recalcAccountBalance(accountId, userId);
  const updated = await accountRepo.findOne({ where: { id: accountId, userId } });

  logger.info(`Real interest adjusted for account ${accountId}: +${amount} (removed ${theoreticalToRemove.length} theoretical)`);

  return {
    transaction,
    account: updated ?? account,
    theoreticalRemoved: theoreticalToRemove.length,
    balanceDelta: round2(amount),
  };
}