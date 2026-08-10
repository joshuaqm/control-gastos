import { AppDataSource } from '../config/database';
import { Account } from '../models/Account';
import { Transaction } from '../models/Transaction';
import { logger } from '../utils/logger';
import cron, { type ScheduledTask } from 'node-cron';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
export const THEORETICAL_NOTE = 'Rendimiento teórico semanal';
const REAL_NOTE = 'Rendimiento real mensual';

function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function endOfMonth(month: Date): Date {
  return new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59);
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86400000);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Theoretical weekly interest accrual for every active, non-credit account with an interest rate.
 * Creates one income transaction per elapsed week (compounded on the balance) and adds it to the account balance.
 * Idempotent: driven by `last_interest_at`; safe to run repeatedly.
 */
export async function accrueWeeklyInterest(): Promise<{ accountId: number; transactions: number; weeks: number }[]> {
  const accountRepo = AppDataSource.getRepository(Account);
  const transactionRepo = AppDataSource.getRepository(Transaction);

  const accounts = await accountRepo.find({
    where: { is_active: true },
  });

  const accrueTargets = accounts.filter(a =>
    a.type !== 'credit' &&
    a.interest_rate != null &&
    Number(a.interest_rate) > 0
  );

  const results: { accountId: number; transactions: number; weeks: number }[] = [];

  for (const account of accrueTargets) {
    const rate = Number(account.interest_rate);
    const weeklyRate = rate / 100 / 52;

    const reference = account.last_interest_at ? startOfDay(new Date(account.last_interest_at)) : startOfDay(new Date(account.created_at));
    const today = startOfDay(new Date());
    const elapsedDays = daysBetween(reference, today);
    if (elapsedDays < 7) continue;

    const weeks = Math.min(Math.floor(elapsedDays / 7), 52); // cap flood after long downtime

    let balance = Number(account.initial_balance);
    const created: Transaction[] = [];
    let cursor = reference;
    for (let w = 0; w < weeks; w++) {
      cursor = new Date(cursor.getTime() + WEEK_MS);
      const amount = round2(balance * weeklyRate);
      balance = round2(balance + amount);
      created.push(transactionRepo.create({
        date: cursor,
        description: 'Rendimiento de intereses',
        amount,
        type: 'income',
        category: 'Intereses',
        budget_type: null,
        notes: THEORETICAL_NOTE,
        account_id: account.id,
        userId: account.userId,
      }));
    }

    if (created.length > 0) {
      await transactionRepo.save(created);
      account.initial_balance = balance;
      account.last_interest_at = today;
      await accountRepo.save(account);
      results.push({ accountId: account.id, transactions: created.length, weeks });
      logger.info(`Interest accrued for account ${account.id} (${account.name}): ${created.length} week(s), balance → ${balance}`);
    }
  }

  return results;
}

/**
 * Monthly real-interest adjustment. Replaces the theoretical accruals of the given (default: current) month
 * for an account with a single real interest transaction.
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
  const monthStart = new Date(monthRef.getFullYear(), monthRef.getMonth(), 1, 0, 0, 0);
  const monthEnd = endOfMonth(monthRef);

  const theoretical = await transactionRepo.find({
    where: {
      account_id: accountId,
      userId,
      type: 'income',
    },
  });

  const theoreticalForMonth = theoretical.filter(t => {
    if (t.notes !== THEORETICAL_NOTE) return false;
    const d = new Date(t.date);
    return d >= monthStart && d <= monthEnd;
  });

  const theoreticalSum = round2(theoreticalForMonth.reduce((s, t) => s + Number(t.amount), 0));

  // Remove theoretical transactions from the month and reverse their balance effect
  if (theoreticalForMonth.length > 0) {
    await transactionRepo.remove(theoreticalForMonth);
  }
  const balanceBefore = Number(account.initial_balance);
  const newBalance = round2(balanceBefore - theoreticalSum + amount);
  account.initial_balance = newBalance;
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

  logger.info(`Real interest adjusted for account ${accountId}: +${amount} (removed ${theoreticalForMonth.length} theoretical, balance → ${newBalance})`);

  return {
    transaction,
    account,
    theoreticalRemoved: theoreticalForMonth.length,
    balanceDelta: round2(amount - theoreticalSum),
  };
}

export function startInterestScheduler(): () => void {
  let running = false;
  const check = async () => {
    if (running) return;
    running = true;
    try {
      await accrueWeeklyInterest();
    } catch (error) {
      logger.error('Weekly interest cron failed:', error);
    } finally {
      running = false;
    }
  };

  // Catch up on startup (idempotent: driven by last_interest_at).
  void check();

  // Weekly cron on Fridays. Override with INTEREST_CRON (cron expression).
  const expression = process.env.INTEREST_CRON || '0 9 * * 5';
  if (!cron.validate(expression)) {
    logger.error(`Invalid INTEREST_CRON expression "${expression}", falling back to Fridays`);
    void check();
    return () => undefined;
  }

  const task: ScheduledTask = cron.schedule(expression, () => void check());
  logger.info(`Interest scheduler started (weekly accrual cron: ${expression})`);
  return () => task.stop();
}