import { Router } from 'express';
import type { DeepPartial } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Transaction } from '../models/Transaction';
import { logger } from '../utils/logger';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.use(authenticate);

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