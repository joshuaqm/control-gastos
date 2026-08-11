import { Router } from 'express';
import { AppDataSource } from '../config/database';
import { Budget } from '../models/Budget';
import { Transaction } from '../models/Transaction';
import { User } from '../models/User';
import { logger } from '../utils/logger';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.use(authenticate);

const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const RULE_DEFAULTS = [
  { budget_type: 'need', percentage: 50 },
  { budget_type: 'want', percentage: 30 },
  { budget_type: 'save', percentage: 20 },
];

const RULE_META: Record<string, { name: string; icon: string; color: string }> = {
  need: { name: 'Necesidades', icon: '🏠', color: '#3B82F6' },
  want: { name: 'Deseos', icon: '🎯', color: '#F59E0B' },
  save: { name: 'Ahorro', icon: '💰', color: '#06D6A0' },
};

const GROUP_ORDER: ('need' | 'want' | 'save' | 'none')[] = ['need', 'want', 'save', 'none'];

const GROUP_META: Record<string, { name: string; icon: string; color: string }> = {
  need: { name: 'Necesidades', icon: '🏠', color: '#3B82F6' },
  want: { name: 'Deseos', icon: '🎯', color: '#F59E0B' },
  save: { name: 'Ahorro', icon: '💰', color: '#06D6A0' },
  none: { name: 'No aplica', icon: '➖', color: '#A3A3C2' },
};

const toNum = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const round2 = (n: number): number => Math.round(n * 100) / 100;
const round1 = (n: number): number => Math.round(n * 10) / 10;

const monthBounds = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const monthKey = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-01`;
  return { start, end, monthKey, label: MONTHS_ES[start.getMonth()] };
};

async function getEffectiveIncome(userId: number): Promise<number> {
  const userRepo = AppDataSource.getRepository(User);
  const transactionRepo = AppDataSource.getRepository(Transaction);

  const user = await userRepo.findOne({ where: { id: userId } });
  if (user?.monthly_income && toNum(user.monthly_income) > 0) {
    return toNum(user.monthly_income);
  }

  const { start, end } = monthBounds();
  const row = await transactionRepo
    .createQueryBuilder('t')
    .select('COALESCE(SUM(t.amount), 0)', 'sum')
    .where('t.userId = :userId', { userId })
    .andWhere('t.type = :type', { type: 'income' })
    .andWhere('t.date >= :start', { start })
    .andWhere('t.date < :end', { end })
    .getRawOne();

  const real = toNum(row?.sum);
  return real > 0 ? real : 15000;
}

// Get budgets summary with real data from transactions.
// Optional ?month=YYYY-MM selects another month for the summary.
router.get('/summary', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const budgetRepo = AppDataSource.getRepository(Budget);
    const transactionRepo = AppDataSource.getRepository(Transaction);
    let { start, end, monthKey, label } = monthBounds();
    const qMonth = req.query.month;
    if (typeof qMonth === 'string' && /^\d{4}-\d{2}$/.test(qMonth)) {
      const [yy, mm] = qMonth.split('-').map(Number);
      if (mm >= 1 && mm <= 12) {
        start = new Date(yy, mm - 1, 1);
        end = new Date(yy, mm, 1);
        monthKey = `${yy}-${String(mm).padStart(2, '0')}-01`;
        label = MONTHS_ES[mm - 1];
      }
    }

    // Real monthly income from transactions
    const incomeRow = await transactionRepo
      .createQueryBuilder('t')
      .select('COALESCE(SUM(t.amount), 0)', 'sum')
      .where('t.userId = :userId', { userId })
      .andWhere('t.type = :type', { type: 'income' })
      .andWhere('t.date >= :start', { start })
      .andWhere('t.date < :end', { end })
      .getRawOne();
    const realIncome = toNum(incomeRow?.sum);

    // Spent grouped by 50/30/20 type
    const typeSpentRaw = await transactionRepo
      .createQueryBuilder('t')
      .select('t.budget_type', 'budget_type')
      .addSelect('COALESCE(SUM(t.amount), 0)', 'spent')
      .where('t.userId = :userId', { userId })
      .andWhere('t.type = :type', { type: 'expense' })
      .andWhere('t.budget_type IS NOT NULL')
      .andWhere('t.date >= :start', { start })
      .andWhere('t.date < :end', { end })
      .groupBy('t.budget_type')
      .getRawMany();

    // Spent grouped by category and 50/30/20 type
    const catTypeSpentRaw = await transactionRepo
      .createQueryBuilder('t')
      .select('t.budget_type', 'budget_type')
      .addSelect('t.category', 'category')
      .addSelect('COALESCE(SUM(t.amount), 0)', 'spent')
      .where('t.userId = :userId', { userId })
      .andWhere('t.type = :type', { type: 'expense' })
      .andWhere('t.category IS NOT NULL')
      .andWhere('t.date >= :start', { start })
      .andWhere('t.date < :end', { end })
      .groupBy('t.budget_type')
      .addGroupBy('t.category')
      .getRawMany();

    // Total spent in the month (all expenses)
    const totalRow = await transactionRepo
      .createQueryBuilder('t')
      .select('COALESCE(SUM(t.amount), 0)', 'total')
      .where('t.userId = :userId', { userId })
      .andWhere('t.type = :type', { type: 'expense' })
      .andWhere('t.date >= :start', { start })
      .andWhere('t.date < :end', { end })
      .getRawOne();
    const totalSpent = toNum(totalRow?.total);

    const budgets = await budgetRepo.find({
      where: { userId, month: new Date(monthKey) },
      order: { id: 'ASC' },
    });

    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: userId } });
    const storedIncome = user && toNum(user.monthly_income) > 0 ? toNum(user.monthly_income) : 0;
    const theoreticalIncome = storedIncome || realIncome || 15000;

    const typeSpent = new Map<string, number>();
    for (const r of typeSpentRaw) typeSpent.set(String(r.budget_type), toNum(r.spent));

    const budgetByType = new Map<string, Budget>();
    for (const b of budgets) {
      if (b.budget_type && !b.category) {
        budgetByType.set(b.budget_type, b);
      }
    }

    const rule = RULE_DEFAULTS.map((def) => {
      const row = budgetByType.get(def.budget_type);
      const meta = RULE_META[def.budget_type];
      const percentage = row ? toNum(row.percentage) : def.percentage;
      const target = round2((percentage / 100) * theoreticalIncome);
      const spent = round2(typeSpent.get(def.budget_type) || 0);
      return {
        id: row?.id ?? null,
        exists: !!row,
        budgetType: def.budget_type,
        name: meta.name,
        icon: meta.icon,
        color: meta.color,
        percentage,
        target,
        spent,
        remaining: round2(target - spent),
      };
    });

    const catSpentByGroup = new Map<string, Map<string, number>>();
    for (const g of GROUP_ORDER) catSpentByGroup.set(g, new Map());
    for (const r of catTypeSpentRaw) {
      const groupKey: string = r.budget_type ? String(r.budget_type) : 'none';
      if (!catSpentByGroup.has(groupKey)) catSpentByGroup.set(groupKey, new Map());
      const map = catSpentByGroup.get(groupKey)!;
      map.set(String(r.category), (map.get(String(r.category)) || 0) + toNum(r.spent));
    }

    const share = (n: number): number => (totalSpent > 0 ? round1((n / totalSpent) * 100) : 0);

    const categories = GROUP_ORDER.map((key) => {
      const meta = GROUP_META[key];
      const map = catSpentByGroup.get(key)!;
      const items = [...map.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([category, spent]) => ({
          category,
          spent: round2(spent),
          share: share(spent),
        }));
      const total = round2(items.reduce((sum, it) => sum + it.spent, 0));
      return {
        budgetType: key === 'none' ? null : key,
        name: meta.name,
        icon: meta.icon,
        color: meta.color,
        total,
        share: share(total),
        items,
      };
    });

    res.json({
      month: monthKey,
      monthLabel: label,
      theoreticalIncome,
      realIncome: round2(realIncome),
      totalSpent: round2(totalSpent),
      rule,
      categories,
    });
  } catch (error) {
    next(error);
  }
});

// Get all budgets (scoped to logged-in user)
router.get('/', async (req, res, next) => {
  try {
    const budgetRepo = AppDataSource.getRepository(Budget);
    const budgets = await budgetRepo.find({
      where: { userId: req.user!.id },
      order: { month: 'DESC', id: 'ASC' },
    });
    res.json(budgets);
  } catch (error) {
    next(error);
  }
});

// Update the user's theoretical monthly income
router.put('/settings', async (req, res, next) => {
  try {
    const { theoreticalIncome } = req.body ?? {};
    const value = toNum(theoreticalIncome);
    if (theoreticalIncome === undefined || !(value >= 0)) {
      throw new AppError('theoreticalIncome must be a positive number', 400);
    }

    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: req.user!.id } });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    user.monthly_income = value;
    await userRepo.save(user);

    logger.info(`Monthly income updated: ${value} (user ${req.user!.id})`);
    res.json({ theoreticalIncome: value });
  } catch (error) {
    next(error);
  }
});

// Create a budget (rule row or category row)
router.post('/', async (req, res, next) => {
  try {
    const { month, budget_type, category, percentage, notes } = req.body ?? {};
    const pct = toNum(percentage);
    const income = await getEffectiveIncome(req.user!.id);
    const budgetRepo = AppDataSource.getRepository(Budget);

    const budget = budgetRepo.create({
      userId: req.user!.id,
      month: month ? new Date(month) : new Date(monthBounds().monthKey),
      budget_type: budget_type || null,
      category: category || null,
      percentage: pct,
      target_amount: round2((pct / 100) * income),
      notes,
    });
    await budgetRepo.save(budget);

    logger.info(`Budget created: ${budget.budget_type ?? budget.category} (user ${req.user!.id})`);
    res.status(201).json(budget);
  } catch (error) {
    next(error);
  }
});

// Update a budget by ID
router.put('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const budgetRepo = AppDataSource.getRepository(Budget);
    const budget = await budgetRepo.findOne({
      where: { id, userId: req.user!.id },
    });

    if (!budget) {
      throw new AppError('Budget not found', 404);
    }

    const { percentage, budget_type, category, notes } = req.body ?? {};
    if (percentage !== undefined) budget.percentage = toNum(percentage);
    if (budget_type !== undefined) budget.budget_type = budget_type || null;
    if (category !== undefined) budget.category = category || null;
    if (notes !== undefined) budget.notes = notes;
    if (percentage !== undefined) {
      const income = await getEffectiveIncome(req.user!.id);
      budget.target_amount = round2((toNum(percentage) / 100) * income);
    }

    await budgetRepo.save(budget);

    logger.info(`Budget updated: ${budget.budget_type ?? budget.category} (id ${id})`);
    res.json(budget);
  } catch (error) {
    next(error);
  }
});

// Delete a budget by ID
router.delete('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const budgetRepo = AppDataSource.getRepository(Budget);
    const budget = await budgetRepo.findOne({
      where: { id, userId: req.user!.id },
    });

    if (!budget) {
      throw new AppError('Budget not found', 404);
    }

    await budgetRepo.remove(budget);

    logger.info(`Budget deleted: ${budget.budget_type ?? budget.category} (id ${id})`);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export { router as budgetsRouter };