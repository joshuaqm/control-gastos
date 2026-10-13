import { Router } from 'express';
import { AppDataSource } from '../config/database';
import { SharedGoal } from '../models/SharedGoal';
import { SharedGoalContribution } from '../models/SharedGoalContribution';
import { SharedAccountMember } from '../models/SharedAccountMember';
import { AppError } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';
import { logger } from '../utils/logger';
import {
  canWrite,
  isManagementRole,
  logActivity,
  requireMembership,
  usersByIds,
  type PublicUser,
} from '../services/social';

const router = Router();
router.use(authenticate);

const round2 = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

const toDate = (value: unknown, fallback: Date | null = null): Date | null => {
  if (!value) return fallback;
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) throw new AppError('Fecha inválida', 400);
  return d;
};

const normalizeAmount = (value: unknown): number => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) throw new AppError('El monto debe ser mayor a 0', 400);
  return n;
};

const contributionTotal = (contributions: SharedGoalContribution[]): number =>
  round2(
    contributions
      .filter((c) => !c.voided_at)
      .reduce((sum, c) => sum + Number(c.amount), 0),
  );

const contributionView = (c: SharedGoalContribution, users: Map<number, PublicUser>) => ({
  ...c,
  amount: Number(c.amount),
  user: users.get(c.user_id) ?? { id: c.user_id, username: `Usuario ${c.user_id}` },
});

const goalView = (
  goal: SharedGoal,
  contributions: SharedGoalContribution[],
  users: Map<number, PublicUser>,
) => {
  const saved = contributionTotal(contributions);
  const target = Number(goal.target_amount);
  return {
    ...goal,
    target_amount: target,
    saved_amount: saved,
    progress: target > 0 ? Math.min(1, round2(saved / target)) : 0,
    contributions: contributions.map((c) => contributionView(c, users)),
  };
};

const requireGoalAccess = async (goalId: number, userId: number) => {
  const goal = await AppDataSource.getRepository(SharedGoal).findOne({ where: { id: goalId } });
  if (!goal) throw new AppError('Meta no encontrada', 404);
  const membership = await requireMembership(goal.shared_account_id, userId);
  return { goal, membership };
};

// GET /api/v1/shared-goals
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const memberships = (await AppDataSource.getRepository(SharedAccountMember).find({
      where: { user_id: userId },
    })).filter((m) => !m.left_at);
    const accountIds = [...new Set(memberships.map((m) => m.shared_account_id))];
    if (accountIds.length === 0) {
      res.json({ goals: [], users: [] });
      return;
    }

    const goals = await AppDataSource.getRepository(SharedGoal).find({
      where: accountIds.map((shared_account_id) => ({ shared_account_id })),
      order: { created_at: 'DESC' },
    });
    if (goals.length === 0) {
      res.json({ goals: [], users: [] });
      return;
    }

    const contributions = await AppDataSource.getRepository(SharedGoalContribution).find({
      where: goals.map((g) => ({ shared_goal_id: g.id })),
    });
    const users = await usersByIds(contributions.map((c) => c.user_id));
    const userMap = new Map(users.map((u) => [u.id, u]));

    res.json({
      goals: goals.map((goal) =>
        goalView(goal, contributions.filter((c) => c.shared_goal_id === goal.id), userMap),
      ),
      users,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/shared-goals  { shared_account_id, name, target_amount, target_date? }
router.post('/', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { shared_account_id, name, target_amount, target_date } = req.body ?? {};
    if (!name || !String(name).trim()) throw new AppError('El nombre es obligatorio', 400);

    const accountId = Number(shared_account_id);
    if (!Number.isFinite(accountId) || accountId <= 0) {
      throw new AppError('Cuenta compartida inválida', 400);
    }
    const membership = await requireMembership(accountId, userId);
    if (!canWrite(membership.role)) throw new AppError('No tienes permiso para crear metas', 403);

    const repo = AppDataSource.getRepository(SharedGoal);
    const goal = await repo.save(
      repo.create({
        shared_account_id: accountId,
        created_by: userId,
        name: String(name).trim().slice(0, 100),
        target_amount: normalizeAmount(target_amount),
        target_date: toDate(target_date),
        status: 'active',
      }),
    );

    await logActivity('shared_goal', goal.id, userId, 'goal_created', { name: goal.name });
    logger.info(`Shared goal ${goal.id} created by ${userId}`);
    res.status(201).json({ goal: goalView(goal, [], new Map()) });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/shared-goals/:id
router.get('/:id', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { goal, membership } = await requireGoalAccess(Number(req.params.id), userId);
    const contributions = await AppDataSource.getRepository(SharedGoalContribution).find({
      where: { shared_goal_id: goal.id },
      order: { date: 'DESC', id: 'DESC' },
    });
    const users = await usersByIds(contributions.map((c) => c.user_id));
    res.json({
      goal: goalView(goal, contributions, new Map(users.map((u) => [u.id, u]))),
      role: membership.role,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/v1/shared-goals/:id  { name?, target_amount?, target_date?, status? }
router.put('/:id', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { goal, membership } = await requireGoalAccess(Number(req.params.id), userId);
    if (!canWrite(membership.role)) throw new AppError('No tienes permiso para editar metas', 403);

    const { name, target_amount, target_date, status } = req.body ?? {};
    if (name !== undefined) {
      if (!String(name).trim()) throw new AppError('El nombre es obligatorio', 400);
      goal.name = String(name).trim().slice(0, 100);
    }
    if (target_amount !== undefined) goal.target_amount = normalizeAmount(target_amount);
    if (target_date !== undefined) goal.target_date = toDate(target_date);
    if (status !== undefined) {
      if (!['active', 'completed', 'archived'].includes(status)) {
        throw new AppError('Estado inválido', 400);
      }
      goal.status = status;
    }

    await AppDataSource.getRepository(SharedGoal).save(goal);
    await logActivity('shared_goal', goal.id, userId, 'goal_updated');
    res.json({ goal: { ...goal, target_amount: Number(goal.target_amount) } });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/shared-goals/:id/contributions
router.get('/:id/contributions', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { goal } = await requireGoalAccess(Number(req.params.id), userId);
    const contributions = await AppDataSource.getRepository(SharedGoalContribution).find({
      where: { shared_goal_id: goal.id },
      order: { date: 'DESC', id: 'DESC' },
    });
    const users = await usersByIds(contributions.map((c) => c.user_id));
    res.json({
      contributions: contributions.map((c) => contributionView(c, new Map(users.map((u) => [u.id, u])))),
      saved_amount: contributionTotal(contributions),
      users,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/shared-goals/:id/contributions  { amount, date?, note? }
router.post('/:id/contributions', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { goal, membership } = await requireGoalAccess(Number(req.params.id), userId);
    if (!canWrite(membership.role)) throw new AppError('No tienes permiso para aportar', 403);

    const { amount, date, note } = req.body ?? {};
    const repo = AppDataSource.getRepository(SharedGoalContribution);
    const contribution = await repo.save(
      repo.create({
        shared_goal_id: goal.id,
        user_id: userId,
        amount: normalizeAmount(amount),
        date: toDate(date, new Date()) as Date,
        note: note ? String(note).slice(0, 200) : null,
      }),
    );

    await logActivity('shared_goal', goal.id, userId, 'contribution_added', {
      amount: Number(contribution.amount),
    });

    const all = await repo.find({ where: { shared_goal_id: goal.id } });
    if (goal.status === 'active' && contributionTotal(all) >= Number(goal.target_amount)) {
      goal.status = 'completed';
      await AppDataSource.getRepository(SharedGoal).save(goal);
    }

    logger.info(`Contribution ${contribution.id} to goal ${goal.id} by ${userId}`);
    res.status(201).json({ contribution: contributionView(contribution, new Map()) });
  } catch (error) {
    next(error);
  }
});

// PUT /api/v1/shared-goals/:id/contributions/:contributionId/void
router.put('/:id/contributions/:contributionId/void', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { goal, membership } = await requireGoalAccess(Number(req.params.id), userId);
    const contributionId = Number(req.params.contributionId);

    const repo = AppDataSource.getRepository(SharedGoalContribution);
    const contribution = await repo.findOne({
      where: { id: contributionId, shared_goal_id: goal.id },
    });
    if (!contribution) throw new AppError('Aportación no encontrada', 404);
    if (contribution.voided_at) throw new AppError('La aportación ya fue anulada', 409);
    if (contribution.user_id !== userId && !isManagementRole(membership.role)) {
      throw new AppError('No puedes anular esta aportación', 403);
    }

    contribution.voided_at = new Date();
    await repo.save(contribution);
    await logActivity('shared_goal', goal.id, userId, 'contribution_voided', {
      contribution: contributionId,
    });
    res.json({ contribution: contributionView(contribution, new Map()) });
  } catch (error) {
    next(error);
  }
});

export { router as sharedGoalsRouter };
