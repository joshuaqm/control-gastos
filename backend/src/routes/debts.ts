import { Router } from 'express';
import type { DeepPartial } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Debt } from '../models/Debt';
import { Transaction } from '../models/Transaction';
import { logger } from '../utils/logger';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.use(authenticate);

// Get all debts (scoped to logged-in user)
router.get('/', async (req, res, next) => {
  try {
    const debtRepo = AppDataSource.getRepository(Debt);
    const debts = await debtRepo.find({
      where: { userId: req.user!.id },
      order: { id: 'ASC' }
    });
    res.json(debts);
  } catch (error) {
    next(error);
  }
});

// Create a debt
router.post('/', async (req, res, next) => {
  try {
    const debtRepo = AppDataSource.getRepository(Debt);
    const debt = debtRepo.create({
      ...(req.body as DeepPartial<Debt>),
      paid_amount: 0,
      userId: req.user!.id,
    });
    await debtRepo.save(debt);

    logger.info(`Debt created: ${debt.name} (user ${req.user!.id})`);
    res.status(201).json(debt);
  } catch (error) {
    next(error);
  }
});

// Get debt by ID
router.get('/:id', async (req, res, next) => {
  try {
    const debtRepo = AppDataSource.getRepository(Debt);
    const debt = await debtRepo.findOne({
      where: { id: parseInt(req.params.id), userId: req.user!.id }
    });

    if (!debt) {
      return next(new AppError('Debt not found', 404));
    }

    res.json(debt);
  } catch (error) {
    next(error);
  }
});

// Update debt by ID
router.put('/:id', async (req, res, next) => {
  try {
    const debtRepo = AppDataSource.getRepository(Debt);
    const id = parseInt(req.params.id);
    const debt = await debtRepo.findOne({
      where: { id, userId: req.user!.id }
    });

    if (!debt) {
      return next(new AppError('Debt not found', 404));
    }

    Object.assign(debt, req.body as DeepPartial<Debt>, {
      userId: req.user!.id,
    });
    await debtRepo.save(debt);

    logger.info(`Debt updated: ${debt.name}`);
    res.json(debt);
  } catch (error) {
    next(error);
  }
});

// Register a payment against a debt.
// Creates a debt_payment transaction linked to the debt and increments paid_amount.
router.post('/:id/pay', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const debtRepo = AppDataSource.getRepository(Debt);
    const debt = await debtRepo.findOne({
      where: { id, userId: req.user!.id }
    });

    if (!debt) {
      return next(new AppError('Debt not found', 404));
    }

    const { amount, account_id, date, description } = req.body ?? {};
    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      return next(new AppError('Invalid payment amount', 400));
    }

    const transactionRepo = AppDataSource.getRepository(Transaction);
    const transaction = transactionRepo.create({
      date: date ? new Date(date) : new Date(),
      description: description || `Pago: ${debt.name}`,
      amount: amountNum,
      type: 'debt_payment',
      category: 'Deudas',
      account_id: account_id ?? null,
      debt_id: debt.id,
      userId: req.user!.id,
    });
    await transactionRepo.save(transaction);

    debt.paid_amount = Number(debt.paid_amount) + amountNum;
    if (Number(debt.paid_amount) >= Number(debt.original_amount)) {
      debt.status = 'paid';
    }
    await debtRepo.save(debt);

    logger.info(`Debt payment registered: ${amountNum} on ${debt.name} (user ${req.user!.id})`);
    res.status(201).json({ debt, transaction });
  } catch (error) {
    next(error);
  }
});

// Delete debt by ID
router.delete('/:id', async (req, res, next) => {
  try {
    const debtRepo = AppDataSource.getRepository(Debt);
    const id = parseInt(req.params.id);
    const debt = await debtRepo.findOne({
      where: { id, userId: req.user!.id }
    });

    if (!debt) {
      return next(new AppError('Debt not found', 404));
    }

    await debtRepo.remove(debt);

    logger.info(`Debt deleted: ${debt.name} (id ${id})`);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export { router as debtsRouter };