import { Router } from 'express';
import type { DeepPartial } from 'typeorm';
import { AppDataSource } from '../config/database';
import { CreditInstallment } from '../models/CreditInstallment';
import { logger } from '../utils/logger';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.use(authenticate);

// Get all installments for the logged-in user (optionally filtered by account)
router.get('/', async (req, res, next) => {
  try {
    const accountId = req.query.account_id ? parseInt(String(req.query.account_id)) : undefined;
    const installmentRepo = AppDataSource.getRepository(CreditInstallment);
    const installments = await installmentRepo.find({
      where: Number.isFinite(accountId) && accountId
        ? { userId: req.user!.id, account_id: accountId }
        : { userId: req.user!.id },
      order: { id: 'ASC' }
    });
    res.json(installments);
  } catch (error) {
    next(error);
  }
});

// Create an installment plan
router.post('/', async (req, res, next) => {
  try {
    const installmentRepo = AppDataSource.getRepository(CreditInstallment);
    const installment = installmentRepo.create({
      ...(req.body as DeepPartial<CreditInstallment>),
      months_paid: 0,
      status: 'active',
      userId: req.user!.id,
    });
    await installmentRepo.save(installment);

    logger.info(`Credit installment created: ${installment.description} (user ${req.user!.id})`);
    res.status(201).json(installment);
  } catch (error) {
    next(error);
  }
});

// Get installment by ID
router.get('/:id', async (req, res, next) => {
  try {
    const installmentRepo = AppDataSource.getRepository(CreditInstallment);
    const installment = await installmentRepo.findOne({
      where: { id: parseInt(req.params.id), userId: req.user!.id }
    });

    if (!installment) {
      return next(new AppError('Installment not found', 404));
    }

    res.json(installment);
  } catch (error) {
    next(error);
  }
});

// Update installment by ID
router.put('/:id', async (req, res, next) => {
  try {
    const installmentRepo = AppDataSource.getRepository(CreditInstallment);
    const id = parseInt(req.params.id);
    const installment = await installmentRepo.findOne({
      where: { id, userId: req.user!.id }
    });

    if (!installment) {
      return next(new AppError('Installment not found', 404));
    }

    Object.assign(installment, req.body as DeepPartial<CreditInstallment>, {
      userId: req.user!.id,
    });
    // Re-derive status from months
    if (Number(installment.months_paid) >= Number(installment.months_total)) {
      installment.status = 'paid';
    } else if (Number(installment.months_paid) === 0) {
      installment.status = 'active';
    }
    await installmentRepo.save(installment);

    logger.info(`Credit installment updated: ${installment.description}`);
    res.json(installment);
  } catch (error) {
    next(error);
  }
});

// Mark one month as paid on an installment plan
router.post('/:id/pay-month', async (req, res, next) => {
  try {
    const installmentRepo = AppDataSource.getRepository(CreditInstallment);
    const id = parseInt(req.params.id);
    const installment = await installmentRepo.findOne({
      where: { id, userId: req.user!.id }
    });

    if (!installment) {
      return next(new AppError('Installment not found', 404));
    }

    if (Number(installment.months_paid) >= Number(installment.months_total)) {
      return next(new AppError('Installment plan already paid', 409));
    }

    installment.months_paid = Number(installment.months_paid) + 1;
    if (Number(installment.months_paid) >= Number(installment.months_total)) {
      installment.status = 'paid';
    }
    await installmentRepo.save(installment);

    logger.info(`Credit installment month paid: ${installment.description} (${installment.months_paid}/${installment.months_total})`);
    res.json(installment);
  } catch (error) {
    next(error);
  }
});

// Delete installment by ID
router.delete('/:id', async (req, res, next) => {
  try {
    const installmentRepo = AppDataSource.getRepository(CreditInstallment);
    const id = parseInt(req.params.id);
    const installment = await installmentRepo.findOne({
      where: { id, userId: req.user!.id }
    });

    if (!installment) {
      return next(new AppError('Installment not found', 404));
    }

    await installmentRepo.remove(installment);

    logger.info(`Credit installment deleted: ${installment.description} (id ${id})`);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export { router as installmentsRouter };