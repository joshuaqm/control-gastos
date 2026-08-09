import { Router } from 'express';
import type { DeepPartial } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Receivable } from '../models/Receivable';
import { Transaction } from '../models/Transaction';
import { logger } from '../utils/logger';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.use(authenticate);

// Get all receivables (scoped to logged-in user)
router.get('/', async (req, res, next) => {
  try {
    const receivableRepo = AppDataSource.getRepository(Receivable);
    const receivables = await receivableRepo.find({
      where: { userId: req.user!.id },
      order: { id: 'ASC' }
    });
    res.json(receivables);
  } catch (error) {
    next(error);
  }
});

// Create a receivable
router.post('/', async (req, res, next) => {
  try {
    const receivableRepo = AppDataSource.getRepository(Receivable);
    const receivable = receivableRepo.create({
      ...(req.body as DeepPartial<Receivable>),
      collected_amount: 0,
      userId: req.user!.id,
    });
    await receivableRepo.save(receivable);

    logger.info(`Receivable created: ${receivable.person} (user ${req.user!.id})`);
    res.status(201).json(receivable);
  } catch (error) {
    next(error);
  }
});

// Get receivable by ID
router.get('/:id', async (req, res, next) => {
  try {
    const receivableRepo = AppDataSource.getRepository(Receivable);
    const receivable = await receivableRepo.findOne({
      where: { id: parseInt(req.params.id), userId: req.user!.id }
    });

    if (!receivable) {
      return next(new AppError('Receivable not found', 404));
    }

    res.json(receivable);
  } catch (error) {
    next(error);
  }
});

// Update receivable by ID
router.put('/:id', async (req, res, next) => {
  try {
    const receivableRepo = AppDataSource.getRepository(Receivable);
    const id = parseInt(req.params.id);
    const receivable = await receivableRepo.findOne({
      where: { id, userId: req.user!.id }
    });

    if (!receivable) {
      return next(new AppError('Receivable not found', 404));
    }

    Object.assign(receivable, req.body as DeepPartial<Receivable>, {
      userId: req.user!.id,
    });
    await receivableRepo.save(receivable);

    logger.info(`Receivable updated: ${receivable.person}`);
    res.json(receivable);
  } catch (error) {
    next(error);
  }
});

// Register a payment received against a receivable.
// Creates an income transaction linked to the receivable and increments collected_amount.
router.post('/:id/collect', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const receivableRepo = AppDataSource.getRepository(Receivable);
    const receivable = await receivableRepo.findOne({
      where: { id, userId: req.user!.id }
    });

    if (!receivable) {
      return next(new AppError('Receivable not found', 404));
    }

    const { amount, account_id, date, description } = req.body ?? {};
    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      return next(new AppError('Invalid collection amount', 400));
    }

    const transactionRepo = AppDataSource.getRepository(Transaction);
    const transaction = transactionRepo.create({
      date: date ? new Date(date) : new Date(),
      description: description || `Cobro de ${receivable.person}`,
      amount: amountNum,
      type: 'income',
      category: 'Cobros',
      account_id: account_id ?? null,
      receivable_id: receivable.id,
      userId: req.user!.id,
    });
    await transactionRepo.save(transaction);

    receivable.collected_amount = Number(receivable.collected_amount) + amountNum;
    if (Number(receivable.collected_amount) >= Number(receivable.original_amount)) {
      receivable.status = 'paid';
    }
    await receivableRepo.save(receivable);

    logger.info(`Receivable collected: ${amountNum} from ${receivable.person} (user ${req.user!.id})`);
    res.status(201).json({ receivable, transaction });
  } catch (error) {
    next(error);
  }
});

// Delete receivable by ID
router.delete('/:id', async (req, res, next) => {
  try {
    const receivableRepo = AppDataSource.getRepository(Receivable);
    const id = parseInt(req.params.id);
    const receivable = await receivableRepo.findOne({
      where: { id, userId: req.user!.id }
    });

    if (!receivable) {
      return next(new AppError('Receivable not found', 404));
    }

    await receivableRepo.remove(receivable);

    logger.info(`Receivable deleted: ${receivable.person} (id ${id})`);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export { router as receivablesRouter };