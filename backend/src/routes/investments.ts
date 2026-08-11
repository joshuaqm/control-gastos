import { Router } from 'express';
import type { DeepPartial } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Investment } from '../models/Investment';
import { fetchMonthlyHistory, refreshInvestmentPrice } from '../services/marketData';
import { logger } from '../utils/logger';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.use(authenticate);

const monthKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

const round2 = (n: number): number => Math.round(n * 100) / 100;

// Get all investments (scoped to logged-in user)
router.get('/', async (req, res, next) => {
  try {
    const investmentRepo = AppDataSource.getRepository(Investment);
    const investments = await investmentRepo.find({
      where: { userId: req.user!.id },
      order: { id: 'ASC' }
    });
    res.json(investments);
  } catch (error) {
    next(error);
  }
});

// Monthly portfolio evolution using historical market prices (max per month),
// with the current month valued at the most up-to-date current_price.
router.get('/evolution', async (req, res, next) => {
  try {
    const investmentRepo = AppDataSource.getRepository(Investment);
    const investments = await investmentRepo.find({
      where: { userId: req.user!.id },
      order: { id: 'ASC' }
    });

    const now = new Date();
    const nowKey = monthKey(now);

    const series = new Map<string, { valor: number; costo: number }>();
    for (const inv of investments) {
      const units = Number(inv.units) || 0;
      const avg = Number(inv.average_cost) || 0;
      const curr = inv.current_price != null ? Number(inv.current_price) : avg;
      const base = inv.purchase_date
        ? new Date(`${String(inv.purchase_date)}T00:00:00`)
        : new Date(inv.created_at);
      const baseKey = monthKey(base);

      let monthly: { month: string; price: number }[] = [];
      if (inv.ticker?.trim()) {
        try {
          monthly = await fetchMonthlyHistory(inv.ticker.trim(), inv.type);
        } catch (error) {
          logger.warn(`Evolution ${inv.name} (${inv.ticker}): ${error instanceof Error ? error.message : error}`);
          monthly = [];
        }
      }

      const pricesByMonth = new Map(monthly.map((m) => [m.month, m.price]));
      // The current month is always valued with the most up-to-date price.
      pricesByMonth.set(nowKey, curr);

      // Walk every month from the purchase month to today.
      const cursor = new Date(base.getFullYear(), base.getMonth(), 1);
      while (cursor <= now) {
        const key = monthKey(cursor);
        const price = pricesByMonth.get(key) ?? curr;
        const entry = series.get(key) ?? { valor: 0, costo: 0 };
        entry.valor += units * price;
        entry.costo += units * avg;
        series.set(key, entry);
        cursor.setMonth(cursor.getMonth() + 1);
      }
    }

    const points = [...series.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, entry]) => ({
        month,
        valor: round2(entry.valor),
        costo: round2(entry.costo),
      }));

    res.json(points);
  } catch (error) {
    next(error);
  }
});

// Create an investment
router.post('/', async (req, res, next) => {
  try {
    const investmentRepo = AppDataSource.getRepository(Investment);
    const investment = investmentRepo.create({
      ...(req.body as DeepPartial<Investment>),
      userId: req.user!.id,
    });
    await investmentRepo.save(investment);

    logger.info(`Investment created: ${investment.name} (user ${req.user!.id})`);
    res.status(201).json(investment);
  } catch (error) {
    next(error);
  }
});

// Get investment by ID
router.get('/:id', async (req, res, next) => {
  try {
    const investmentRepo = AppDataSource.getRepository(Investment);
    const investment = await investmentRepo.findOne({
      where: { id: parseInt(req.params.id), userId: req.user!.id }
    });

    if (!investment) {
      return next(new AppError('Investment not found', 404));
    }

    res.json(investment);
  } catch (error) {
    next(error);
  }
});

// Update investment by ID
router.put('/:id', async (req, res, next) => {
  try {
    const investmentRepo = AppDataSource.getRepository(Investment);
    const id = parseInt(req.params.id);
    const investment = await investmentRepo.findOne({
      where: { id, userId: req.user!.id }
    });

    if (!investment) {
      return next(new AppError('Investment not found', 404));
    }

    Object.assign(investment, req.body as DeepPartial<Investment>, {
      userId: req.user!.id,
    });
    await investmentRepo.save(investment);

    logger.info(`Investment updated: ${investment.name}`);
    res.json(investment);
  } catch (error) {
    next(error);
  }
});

// Refresh the current price of a single investment from the market API
router.post('/:id/refresh', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const investmentRepo = AppDataSource.getRepository(Investment);
    const investment = await investmentRepo.findOne({
      where: { id, userId: req.user!.id }
    });

    if (!investment) {
      return next(new AppError('Investment not found', 404));
    }

    const result = await refreshInvestmentPrice(investment);
    investment.current_price = result.price;
    investment.last_updated = new Date();
    await investmentRepo.save(investment);

    logger.info(`Investment price refreshed: ${investment.name} → ${result.price} MXN`);
    res.json(investment);
  } catch (error) {
    next(new AppError(
      error instanceof Error ? error.message : 'No se pudo actualizar el precio',
      404
    ));
  }
});

// Refresh prices for all investments with a ticker
router.post('/refresh-all', async (req, res, next) => {
  try {
    const investmentRepo = AppDataSource.getRepository(Investment);
    const investments = await investmentRepo.find({
      where: { userId: req.user!.id }
    });

    const results: { id: number; name: string; ticker: string | null; success: boolean; price?: number; error?: string }[] = [];
    for (const investment of investments) {
      const ticker = investment.ticker?.trim();
      if (!ticker) {
        results.push({ id: investment.id, name: investment.name, ticker: null, success: false, error: 'Sin ticker' });
        continue;
      }
      try {
        const quote = await refreshInvestmentPrice(investment);
        investment.current_price = quote.price;
        investment.last_updated = new Date();
        await investmentRepo.save(investment);
        results.push({ id: investment.id, name: investment.name, ticker, success: true, price: quote.price });
      } catch (error) {
        results.push({ id: investment.id, name: investment.name, ticker, success: false, error: error instanceof Error ? error.message : 'Error' });
      }
    }

    const successCount = results.filter(r => r.success).length;
    logger.info(`Refreshed prices: ${successCount}/${results.length} OK`);
    res.json({ results, successCount, total: results.length });
  } catch (error) {
    next(error);
  }
});

// Delete investment by ID
router.delete('/:id', async (req, res, next) => {
  try {
    const investmentRepo = AppDataSource.getRepository(Investment);
    const id = parseInt(req.params.id);
    const investment = await investmentRepo.findOne({
      where: { id, userId: req.user!.id }
    });

    if (!investment) {
      return next(new AppError('Investment not found', 404));
    }

    await investmentRepo.remove(investment);

    logger.info(`Investment deleted: ${investment.name} (id ${id})`);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export { router as investmentsRouter };