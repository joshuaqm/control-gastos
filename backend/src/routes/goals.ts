import { Router } from 'express';
import type { DeepPartial } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Goal } from '../models/Goal';
import { Account } from '../models/Account';
import { Transaction } from '../models/Transaction';
import { logger } from '../utils/logger';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.use(authenticate);

// Get all savings goals (scoped to logged-in user)
router.get('/', async (req, res, next) => {
  try {
    const goalRepo = AppDataSource.getRepository(Goal);
    const goals = await goalRepo.find({
      where: { userId: req.user!.id },
      order: { priority: 'ASC', id: 'ASC' }
    });
    res.json(goals);
  } catch (error) {
    next(error);
  }
});

// Create a savings goal
router.post('/', async (req, res, next) => {
  try {
    const goalRepo = AppDataSource.getRepository(Goal);
    const goal = goalRepo.create({
      ...(req.body as DeepPartial<Goal>),
      userId: req.user!.id,
    });
    await goalRepo.save(goal);

    logger.info(`Savings goal created: ${goal.name} (user ${req.user!.id})`);
    res.status(201).json(goal);
  } catch (error) {
    next(error);
  }
});

// Get goal by ID
router.get('/:id', async (req, res, next) => {
  try {
    const goalRepo = AppDataSource.getRepository(Goal);
    const goal = await goalRepo.findOne({
      where: { id: parseInt(req.params.id), userId: req.user!.id }
    });

    if (!goal) {
      return next(new AppError('Savings goal not found', 404));
    }

    res.json(goal);
  } catch (error) {
    next(error);
  }
});

// Update goal by ID
router.put('/:id', async (req, res, next) => {
  try {
    const goalRepo = AppDataSource.getRepository(Goal);
    const id = parseInt(req.params.id);
    const goal = await goalRepo.findOne({
      where: { id, userId: req.user!.id }
    });

    if (!goal) {
      return next(new AppError('Savings goal not found', 404));
    }

    Object.assign(goal, req.body as DeepPartial<Goal>, {
      userId: req.user!.id,
    });
    await goalRepo.save(goal);

    logger.info(`Savings goal updated: ${goal.name}`);
    res.json(goal);
  } catch (error) {
    next(error);
  }
});

// Register a deposit toward a goal:
// creates a real transaction debited from the source account and increments goal current_amount.
// If the goal has a linked account (destination), the money also lands there (transfer); otherwise it's a saving expense.
router.post('/:id/deposit', async (req, res, next) => {
  try {
    const goalRepo = AppDataSource.getRepository(Goal);
    const accountRepo = AppDataSource.getRepository(Account);
    const transactionRepo = AppDataSource.getRepository(Transaction);

    const id = parseInt(req.params.id);
    const goal = await goalRepo.findOne({
      where: { id, userId: req.user!.id }
    });

    if (!goal) {
      return next(new AppError('Savings goal not found', 404));
    }

    const amount = Number(req.body?.amount);
    const sourceAccountId = Number(req.body?.account_id);
    const date = req.body?.date ? new Date(`${String(req.body.date).slice(0, 10)}T00:00:00`) : new Date();

    if (!Number.isFinite(amount) || amount <= 0) {
      return next(new AppError('Ingresa un monto válido', 400));
    }
    if (!Number.isFinite(sourceAccountId) || sourceAccountId <= 0) {
      return next(new AppError('Selecciona la cuenta de origen', 400));
    }

    const source = await accountRepo.findOne({
      where: { id: sourceAccountId, userId: req.user!.id, is_active: true }
    });
    if (!source) {
      return next(new AppError('Cuenta de origen no encontrada', 404));
    }
    if (source.type === 'credit') {
      return next(new AppError('No puedes abonar desde una tarjeta de crédito', 400));
    }

    const hasDestination = goal.account_id != null && goal.account_id !== source.id;
    const destination = hasDestination
      ? await accountRepo.findOne({ where: { id: goal.account_id!, userId: req.user!.id, is_active: true } })
      : null;
    if (hasDestination && !destination) {
      return next(new AppError('Cuenta destino no encontrada', 404));
    }

    const transaction = transactionRepo.create({
      date,
      description: `Ahorro: ${goal.name}`,
      amount,
      type: hasDestination ? 'transfer' : 'expense' as const,
      category: 'Ahorro',
      budget_type: 'save' as const,
      account_id: source.id,
      destination_account_id: destination ? destination.id : null,
      goal_id: goal.id,
      userId: req.user!.id,
    });
    await transactionRepo.save(transaction);

    source.initial_balance = Number(source.initial_balance) - amount;
    await accountRepo.save(source);
    if (destination) {
      destination.initial_balance = Number(destination.initial_balance) + amount;
      await accountRepo.save(destination);
    }

    goal.current_amount = Number(goal.current_amount) + amount;
    await goalRepo.save(goal);

    logger.info(`Savings goal deposit: +${amount} → ${goal.name} (user ${req.user!.id})`);
    res.json(goal);
  } catch (error) {
    next(error);
  }
});

// Delete goal by ID
router.delete('/:id', async (req, res, next) => {
  try {
    const goalRepo = AppDataSource.getRepository(Goal);
    const id = parseInt(req.params.id);
    const goal = await goalRepo.findOne({
      where: { id, userId: req.user!.id }
    });

    if (!goal) {
      return next(new AppError('Savings goal not found', 404));
    }

    await goalRepo.remove(goal);

    logger.info(`Savings goal deleted: ${goal.name} (id ${id})`);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export { router as goalsRouter };