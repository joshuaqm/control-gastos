import { Router } from 'express';
import type { DeepPartial } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Account } from '../models/Account';
import { Transaction } from '../models/Transaction';
import { recalcTwoAccountBalances } from '../services/recalcBalance';
import { logger } from '../utils/logger';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.use(authenticate);

/**
 * Returns the stored balance of an account. The balance column is kept in
 * sync by `recalcAccountBalance` after every transaction mutation.
 */
async function getStoredBalance(
  userId: number,
  accountId: number,
): Promise<number> {
  const accountRepo = AppDataSource.getRepository(Account);
  const account = await accountRepo.findOne({ where: { id: accountId, userId } });
  return account ? Number(account.initial_balance) || 0 : 0;
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

  // When editing a transfer, we need to account for the fact that the old
  // transaction's effect is already baked into the stored balance. We
  // temporarily reverse it to compute the "real" available funds.
  let balance = await getStoredBalance(userId, sourceAccountId);
  if (excludeTransactionId != null) {
    const transactionRepo = AppDataSource.getRepository(Transaction);
    const oldTxn = await transactionRepo.findOne({ where: { id: excludeTransactionId, userId } });
    if (oldTxn && oldTxn.account_id === sourceAccountId) {
      if (oldTxn.type === 'income') {
        balance -= Number(oldTxn.amount);
      } else {
        balance += Number(oldTxn.amount);
      }
    }
  }

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

    // Update affected account balances
    if (transaction.account_id != null) {
      await recalcTwoAccountBalances(
        req.user!.id,
        transaction.account_id,
        transaction.destination_account_id,
      );
    }

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

    // Track old accounts before the update
    const oldAccountId = transaction.account_id;
    const oldDestId = transaction.destination_account_id;

    Object.assign(transaction, req.body as DeepPartial<Transaction>, {
      userId: req.user!.id,
    });
    await transactionRepo.save(transaction);

    // Update affected account balances (old + new accounts)
    const accountsToRecalc = new Set<number | null>([
      oldAccountId,
      oldDestId,
      transaction.account_id,
      transaction.destination_account_id,
    ]);
    for (const accId of accountsToRecalc) {
      if (accId != null) {
        await recalcTwoAccountBalances(req.user!.id, accId);
      }
    }

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

    const accId = transaction.account_id;
    const destId = transaction.destination_account_id;

    await transactionRepo.remove(transaction);

    // Update affected account balances
    if (accId != null) await recalcTwoAccountBalances(req.user!.id, accId, destId);

    logger.info(`Transaction deleted: ${id} (user ${req.user!.id})`);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export { router as transactionsRouter };
