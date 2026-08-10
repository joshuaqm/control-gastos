import { Router } from 'express';
import type { DeepPartial } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Account } from '../models/Account';
import { Transaction } from '../models/Transaction';
import { logger } from '../utils/logger';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.use(authenticate);

/**
 * Effective balance of an account derived from its initial balance plus every
 * movement that touches it: incomes on the account add; outbound movements on
 * the account (expenses, transfers out, debt payments) subtract; transfers that
 * land on the account via destination_account_id add.
 */
async function accountEffectiveBalance(
  userId: number,
  accountId: number,
  excludeTransactionId?: number,
): Promise<number> {
  const accountRepo = AppDataSource.getRepository(Account);
  const transactionRepo = AppDataSource.getRepository(Transaction);
  const account = await accountRepo.findOne({ where: { id: accountId, userId } });
  if (!account) {
    return 0;
  }
  const txns = await transactionRepo.find({
    where: [
      { account_id: accountId, userId },
      { destination_account_id: accountId, userId },
    ],
  });
  let balance = Number(account.initial_balance) || 0;
  for (const t of txns) {
    if (excludeTransactionId != null && t.id === excludeTransactionId) continue;
    if (t.account_id === accountId) {
      balance += Number(t.amount) * (t.type === 'income' ? 1 : -1);
    } else if (t.destination_account_id === accountId) {
      balance += Number(t.amount);
    }
  }
  return Math.round(balance * 100) / 100;
}

/** Validates a transfer: source must exist, not be a credit card, and have funds. */
async function assertTransferAllowed(
  userId: number,
  sourceAccountId: number | null | undefined,
  amount: number,
  excludeTransactionId?: number,
  destinationAccountId?: number | null,
) {
  if (sourceAccountId == null) {
    throw new AppError('La transferencia requiere una cuenta de origen', 400);
  }
  if (destinationAccountId != null && destinationAccountId === sourceAccountId) {
    throw new AppError('La cuenta de origen y destino no pueden ser la misma', 400);
  }
  const accountRepo = AppDataSource.getRepository(Account);
  const source = await accountRepo.findOne({
    where: { id: sourceAccountId, userId },
  });
  if (!source) {
    throw new AppError('Cuenta de origen no encontrada', 404);
  }
  if (source.type === 'credit') {
    throw new AppError('No puedes transferir desde una tarjeta de crédito', 400);
  }
  const balance = await accountEffectiveBalance(userId, sourceAccountId, excludeTransactionId);
  if (balance + 0.005 < amount) {
    throw new AppError(
      `Saldo insuficiente: la cuenta "${source.name}" solo tiene ${balance.toFixed(2)}`,
      400,
    );
  }
}

// Get all transactions (scoped to logged-in user)
router.get('/', async (req, res, next) => {
  try {
    const transactionRepo = AppDataSource.getRepository(Transaction);
    const transactions = await transactionRepo.find({
      where: { userId: req.user!.id },
      order: { date: 'DESC' },
      take: 100
    });
    res.json(transactions);
  } catch (error) {
    next(error);
  }
});

// Create a transaction
router.post('/', async (req, res, next) => {
  try {
    const body = req.body as {
      type?: string;
      amount?: number;
      account_id?: number | null;
      destination_account_id?: number | null;
    };
    if (body.type === 'transfer') {
      await assertTransferAllowed(
        req.user!.id,
        body.account_id,
        Number(body.amount),
        undefined,
        body.destination_account_id,
      );
    }
    const transactionRepo = AppDataSource.getRepository(Transaction);
    const transaction = transactionRepo.create({
      ...(req.body as DeepPartial<Transaction>),
      userId: req.user!.id,
    });
    await transactionRepo.save(transaction);

    logger.info(`Transaction created: ${transaction.id} (user ${req.user!.id})`);
    res.status(201).json(transaction);
  } catch (error) {
    next(error);
  }
});

// Get transaction by ID
router.get('/:id', async (req, res, next) => {
  try {
    const transactionRepo = AppDataSource.getRepository(Transaction);
    const transaction = await transactionRepo.findOne({
      where: { id: parseInt(req.params.id), userId: req.user!.id }
    });

    if (!transaction) {
      return next(new AppError('Transaction not found', 404));
    }

    res.json(transaction);
  } catch (error) {
    next(error);
  }
});

// Update transaction by ID
router.put('/:id', async (req, res, next) => {
  try {
    const transactionRepo = AppDataSource.getRepository(Transaction);
    const id = parseInt(req.params.id);
    const transaction = await transactionRepo.findOne({
      where: { id, userId: req.user!.id }
    });

    if (!transaction) {
      return next(new AppError('Transaction not found', 404));
    }

    const body = req.body as {
      type?: string;
      amount?: number;
      account_id?: number | null;
      destination_account_id?: number | null;
    };
    if ((body.type ?? transaction.type) === 'transfer') {
      await assertTransferAllowed(
        req.user!.id,
        body.account_id ?? transaction.account_id,
        Number(body.amount ?? transaction.amount),
        id,
        body.destination_account_id ?? transaction.destination_account_id,
      );
    }

    Object.assign(transaction, req.body as DeepPartial<Transaction>, {
      userId: req.user!.id,
    });
    await transactionRepo.save(transaction);

    logger.info(`Transaction updated: ${transaction.id} (user ${req.user!.id})`);
    res.json(transaction);
  } catch (error) {
    next(error);
  }
});

// Delete transaction by ID
router.delete('/:id', async (req, res, next) => {
  try {
    const transactionRepo = AppDataSource.getRepository(Transaction);
    const id = parseInt(req.params.id);
    const transaction = await transactionRepo.findOne({
      where: { id, userId: req.user!.id }
    });

    if (!transaction) {
      return next(new AppError('Transaction not found', 404));
    }

    await transactionRepo.remove(transaction);

    logger.info(`Transaction deleted: ${id} (user ${req.user!.id})`);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export { router as transactionsRouter };