import { Router } from 'express';
import type { DeepPartial } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Account } from '../models/Account';
import { Transaction } from '../models/Transaction';
import { adjustRealInterest } from '../services/interestAccrual';
import { logger } from '../utils/logger';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.use(authenticate);

// Get all accounts (scoped to logged-in user)
router.get('/', async (req, res, next) => {
  try {
    const accountRepo = AppDataSource.getRepository(Account);
    const accounts = await accountRepo.find({
      where: { userId: req.user!.id, is_active: true },
      order: { id: 'ASC' }
    });
    res.json(accounts);
  } catch (error) {
    next(error);
  }
});

// Create an account
router.post('/', async (req, res, next) => {
  try {
    const accountRepo = AppDataSource.getRepository(Account);
    const account = accountRepo.create({
      ...(req.body as DeepPartial<Account>),
      userId: req.user!.id,
    });
    await accountRepo.save(account);

    logger.info(`Account created: ${account.name} (user ${req.user!.id})`);
    res.status(201).json(account);
  } catch (error) {
    next(error);
  }
});

// Get account by ID
router.get('/:id', async (req, res, next) => {
  try {
    const accountRepo = AppDataSource.getRepository(Account);
    const account = await accountRepo.findOne({
      where: { id: parseInt(req.params.id), userId: req.user!.id }
    });

    if (!account) {
      return next(new AppError('Account not found', 404));
    }

    res.json(account);
  } catch (error) {
    next(error);
  }
});

// Update account by ID
router.put('/:id', async (req, res, next) => {
  try {
    const accountRepo = AppDataSource.getRepository(Account);
    const id = parseInt(req.params.id);
    const account = await accountRepo.findOne({
      where: { id, userId: req.user!.id }
    });

    if (!account) {
      return next(new AppError('Account not found', 404));
    }

    Object.assign(account, req.body as DeepPartial<Account>, {
      userId: req.user!.id,
    });
    await accountRepo.save(account);

    logger.info(`Account updated: ${account.name}`);
    res.json(account);
  } catch (error) {
    next(error);
  }
});

// Adjust real monthly interest for an account (replaces theoretical accruals of that month)
router.post('/:id/adjust-interest', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const amount = Number(req.body?.amount);
    const month = req.body?.month ? new Date(`${String(req.body.month).slice(0, 7)}-01T00:00:00`) : undefined;

    const result = await adjustRealInterest(id, req.user!.id, amount, month);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Delete account by ID (only if it has no transactions)
router.delete('/:id', async (req, res, next) => {
  try {
    const accountRepo = AppDataSource.getRepository(Account);
    const id = parseInt(req.params.id);
    const account = await accountRepo.findOne({
      where: { id, userId: req.user!.id }
    });

    if (!account) {
      return next(new AppError('Account not found', 404));
    }

    const transactionRepo = AppDataSource.getRepository(Transaction);
    const hasTransactions = await transactionRepo.exists({
      where: [
        { account_id: id, userId: req.user!.id },
        { destination_account_id: id, userId: req.user!.id }
      ]
    });

    if (hasTransactions) {
      return next(new AppError('Cannot delete account: it has associated transactions', 409));
    }

    await accountRepo.remove(account);

    logger.info(`Account deleted: ${account.name} (id ${id})`);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export { router as accountsRouter };