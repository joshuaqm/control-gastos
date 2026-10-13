import { Router } from 'express';
import type { DeepPartial } from 'typeorm';
import { AppDataSource } from '../config/database';
import { RecurringTransaction } from '../models/RecurringTransaction';
import { Transaction } from '../models/Transaction';
import { applyCreate } from '../services/recalcBalance';
import { logger } from '../utils/logger';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.use(authenticate);

function toDate(value: Date | string): Date {
  return value instanceof Date ? new Date(value) : new Date(`${String(value).slice(0, 10)}T00:00:00`);
}

/** Local YYYY-MM-DD key, so date-only strings don't shift a day across timezones. */
function dayKey(value: Date | string): string {
  const d = toDate(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function advanceDate(value: Date | string, frequency: string, intervalDays?: number | null): Date {
  const current = toDate(value);
  const next = new Date(current);
  switch (frequency) {
    case 'weekly':
      next.setDate(current.getDate() + 7);
      break;
    case 'biweekly':
      next.setDate(current.getDate() + 14);
      break;
    case 'yearly':
      next.setFullYear(current.getFullYear() + 1);
      break;
    case 'interval':
      next.setDate(current.getDate() + (intervalDays && intervalDays > 0 ? intervalDays : 30));
      break;
    case 'monthly':
    default:
      next.setMonth(current.getMonth() + 1);
      break;
  }
  return next;
}

// Get all recurring transactions (scoped to logged-in user)
router.get('/', async (req, res, next) => {
  try {
    const recurringRepo = AppDataSource.getRepository(RecurringTransaction);
    const recurring = await recurringRepo.find({
      where: { userId: req.user!.id },
      order: { id: 'ASC' }
    });
    res.json(recurring);
  } catch (error) {
    next(error);
  }
});

// Create a recurring transaction
router.post('/', async (req, res, next) => {
  try {
    const recurringRepo = AppDataSource.getRepository(RecurringTransaction);
    const recurring = recurringRepo.create({
      ...(req.body as DeepPartial<RecurringTransaction>),
      userId: req.user!.id,
    });
    await recurringRepo.save(recurring);

    logger.info(`Recurring transaction created: ${recurring.name} (user ${req.user!.id})`);
    res.status(201).json(recurring);
  } catch (error) {
    next(error);
  }
});

// Get recurring transaction by ID
router.get('/:id', async (req, res, next) => {
  try {
    const recurringRepo = AppDataSource.getRepository(RecurringTransaction);
    const recurring = await recurringRepo.findOne({
      where: { id: parseInt(req.params.id), userId: req.user!.id }
    });

    if (!recurring) {
      return next(new AppError('Recurring transaction not found', 404));
    }

    res.json(recurring);
  } catch (error) {
    next(error);
  }
});

// Update recurring transaction by ID
router.put('/:id', async (req, res, next) => {
  try {
    const recurringRepo = AppDataSource.getRepository(RecurringTransaction);
    const id = parseInt(req.params.id);
    const recurring = await recurringRepo.findOne({
      where: { id, userId: req.user!.id }
    });

    if (!recurring) {
      return next(new AppError('Recurring transaction not found', 404));
    }

    Object.assign(recurring, req.body as DeepPartial<RecurringTransaction>, {
      userId: req.user!.id,
    });
    await recurringRepo.save(recurring);

    logger.info(`Recurring transaction updated: ${recurring.name}`);
    res.json(recurring);
  } catch (error) {
    next(error);
  }
});

// Register the payment for a recurring transaction:
// creates a real transaction linked to it and advances its next_date.
router.post('/:id/register', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const recurringRepo = AppDataSource.getRepository(RecurringTransaction);
    const recurring = await recurringRepo.findOne({
      where: { id, userId: req.user!.id }
    });

    if (!recurring) {
      return next(new AppError('Recurring transaction not found', 404));
    }
    if (!recurring.is_active) {
      return next(new AppError('Recurring transaction is inactive', 409));
    }

    const { account_id, date, description } = req.body ?? {};
    const amount = Number(recurring.amount);
    const effectiveDate = date ? toDate(date) : toDate(recurring.next_date);

    const transactionRepo = AppDataSource.getRepository(Transaction);

    // Idempotency: never book the same recurring charge twice for the same day
    // (prevents double discounting the account balance on retries).
    const existing = await transactionRepo.find({
      where: { recurring_id: recurring.id, userId: req.user!.id },
    });
    if (existing.some(t => dayKey(t.date) === dayKey(effectiveDate))) {
      return next(
        new AppError('El cobro de esta fecha ya fue registrado', 409),
      );
    }

    const transaction = transactionRepo.create({
      date: effectiveDate,
      description: description || recurring.name,
      amount,
      type: 'expense',
      category: recurring.category || 'Suscripciones',
      budget_type: (recurring.budget_type || null) as 'need' | 'want' | 'save' | null,
      account_id: account_id ?? recurring.account_id,
      recurring_id: recurring.id,
      userId: req.user!.id,
    });
    await transactionRepo.save(transaction);

    // Debit the selected account by the payment amount.
    await applyCreate(req.user!.id, transaction);

    recurring.next_date = advanceDate(recurring.next_date, recurring.frequency, recurring.interval_days);
    await recurringRepo.save(recurring);

    logger.info(`Recurring payment registered: ${recurring.name} (user ${req.user!.id})`);
    res.status(201).json({ transaction, recurring });
  } catch (error) {
    next(error);
  }
});

// Delete recurring transaction by ID
router.delete('/:id', async (req, res, next) => {
  try {
    const recurringRepo = AppDataSource.getRepository(RecurringTransaction);
    const id = parseInt(req.params.id);
    const recurring = await recurringRepo.findOne({
      where: { id, userId: req.user!.id }
    });

    if (!recurring) {
      return next(new AppError('Recurring transaction not found', 404));
    }

    await recurringRepo.remove(recurring);

    logger.info(`Recurring transaction deleted: ${recurring.name} (id ${id})`);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export { router as recurringRouter };