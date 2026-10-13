import { Router } from 'express';
import { AppDataSource } from '../config/database';
import { SharedAccount } from '../models/SharedAccount';
import { SharedAccountMember, type SharedRole } from '../models/SharedAccountMember';
import { SharedEntry, type SharedEntryType } from '../models/SharedEntry';
import { ActivityLog } from '../models/ActivityLog';
import { AppError } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';
import { logger } from '../utils/logger';
import {
  areFriends,
  canWrite,
  computeSharedBalance,
  isManagementRole,
  logActivity,
  requireMembership,
  usersByIds,
  type PublicUser,
} from '../services/social';

const router = Router();
router.use(authenticate);

const ENTRY_TYPES: SharedEntryType[] = ['contribution', 'withdrawal', 'expense', 'transfer'];
const MEMBER_ROLES: SharedRole[] = ['owner', 'admin', 'member', 'viewer'];

const toDate = (value: unknown): Date => {
  const d = value ? new Date(String(value)) : new Date();
  if (Number.isNaN(d.getTime())) throw new AppError('Fecha inválida', 400);
  return d;
};

const normalizeAmount = (value: unknown): number => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) throw new AppError('El monto debe ser mayor a 0', 400);
  return n;
};

const memberView = (member: SharedAccountMember, users: Map<number, PublicUser>) => ({
  user_id: member.user_id,
  role: member.role,
  joined_at: member.joined_at,
  user: users.get(member.user_id) ?? { id: member.user_id, username: `Usuario ${member.user_id}` },
});

const entryView = (entry: SharedEntry, users: Map<number, PublicUser>) => ({
  ...entry,
  amount: Number(entry.amount),
  user: users.get(entry.user_id) ?? { id: entry.user_id, username: `Usuario ${entry.user_id}` },
});

// GET /api/v1/shared-accounts
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const memberRepo = AppDataSource.getRepository(SharedAccountMember);
    const myMemberships = (await memberRepo.find({ where: { user_id: userId } })).filter(
      (m) => !m.left_at,
    );
    const accountIds = [...new Set(myMemberships.map((m) => m.shared_account_id))];
    if (accountIds.length === 0) {
      res.json({ accounts: [], users: [] });
      return;
    }

    const accounts = await AppDataSource.getRepository(SharedAccount).find({
      where: accountIds.map((id) => ({ id })),
    });
    const members = await memberRepo.find({
      where: accountIds.map((shared_account_id) => ({ shared_account_id })),
    });
    const entries = await AppDataSource.getRepository(SharedEntry).find({
      where: accountIds.map((shared_account_id) => ({ shared_account_id })),
    });

    const users = await usersByIds(members.map((m) => m.user_id));
    const userMap = new Map(users.map((u) => [u.id, u]));
    const roleMap = new Map(myMemberships.map((m) => [m.shared_account_id, m.role]));

    const list = accounts
      .filter((a) => a.status !== 'archived')
      .map((account) => ({
        ...account,
        role: roleMap.get(account.id) ?? 'member',
        balance: computeSharedBalance(entries.filter((e) => e.shared_account_id === account.id)),
        members: members
          .filter((m) => m.shared_account_id === account.id && !m.left_at)
          .map((m) => memberView(m, userMap)),
      }));

    res.json({ accounts: list, users });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/shared-accounts  { name, kind? }
router.post('/', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { name, kind } = req.body ?? {};
    if (!name || !String(name).trim()) throw new AppError('El nombre es obligatorio', 400);

    const accountRepo = AppDataSource.getRepository(SharedAccount);
    const memberRepo = AppDataSource.getRepository(SharedAccountMember);

    const account = await accountRepo.save(
      accountRepo.create({
        name: String(name).trim().slice(0, 100),
        kind: kind ?? 'pool',
        owner_id: userId,
        status: 'active',
      }),
    );
    const member = await memberRepo.save(
      memberRepo.create({ shared_account_id: account.id, user_id: userId, role: 'owner' }),
    );

    await logActivity('shared_account', account.id, userId, 'account_created', { name: account.name });
    logger.info(`Shared account ${account.id} created by ${userId}`);

    const users = await usersByIds([userId]);
    res.status(201).json({
      account: {
        ...account,
        role: 'owner',
        balance: 0,
        members: [memberView(member, new Map(users.map((u) => [u.id, u])))],
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/shared-accounts/:id
router.get('/:id', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const accountId = Number(req.params.id);
    const membership = await requireMembership(accountId, userId);

    const account = await AppDataSource.getRepository(SharedAccount).findOne({ where: { id: accountId } });
    if (!account) throw new AppError('Cuenta no encontrada', 404);

    const members = await AppDataSource.getRepository(SharedAccountMember).find({
      where: { shared_account_id: accountId },
    });
    const entries = await AppDataSource.getRepository(SharedEntry).find({
      where: { shared_account_id: accountId },
      order: { date: 'DESC', id: 'DESC' },
    });

    const users = await usersByIds([
      ...members.map((m) => m.user_id),
      ...entries.map((e) => e.user_id),
    ]);
    const userMap = new Map(users.map((u) => [u.id, u]));

    res.json({
      account: {
        ...account,
        role: membership.role,
        balance: computeSharedBalance(entries),
        members: members.filter((m) => !m.left_at).map((m) => memberView(m, userMap)),
      },
      entries: entries.map((e) => entryView(e, userMap)),
      users,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/v1/shared-accounts/:id  { name?, kind?, status? }
router.put('/:id', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const accountId = Number(req.params.id);
    const membership = await requireMembership(accountId, userId);
    if (!isManagementRole(membership.role)) {
      throw new AppError('Solo propietario o administrador pueden editar la cuenta', 403);
    }

    const account = await AppDataSource.getRepository(SharedAccount).findOne({ where: { id: accountId } });
    if (!account) throw new AppError('Cuenta no encontrada', 404);

    const { name, kind, status } = req.body ?? {};
    if (name !== undefined) {
      if (!String(name).trim()) throw new AppError('El nombre es obligatorio', 400);
      account.name = String(name).trim().slice(0, 100);
    }
    if (kind !== undefined) account.kind = kind;
    if (status !== undefined) {
      if (!['active', 'archived'].includes(status)) throw new AppError('Estado inválido', 400);
      account.status = status;
    }

    await AppDataSource.getRepository(SharedAccount).save(account);
    await logActivity('shared_account', accountId, userId, 'account_updated');
    res.json({ account: { ...account } });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/shared-accounts/:id  (archive, never hard delete)
router.delete('/:id', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const accountId = Number(req.params.id);
    const membership = await requireMembership(accountId, userId);
    if (membership.role !== 'owner') {
      throw new AppError('Solo el propietario puede archivar la cuenta', 403);
    }

    const repo = AppDataSource.getRepository(SharedAccount);
    const account = await repo.findOne({ where: { id: accountId } });
    if (!account) throw new AppError('Cuenta no encontrada', 404);

    account.status = 'archived';
    await repo.save(account);
    await logActivity('shared_account', accountId, userId, 'account_archived');
    logger.info(`Shared account ${accountId} archived by ${userId}`);
    res.json({ message: 'Cuenta archivada' });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/shared-accounts/:id/members
router.get('/:id/members', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const accountId = Number(req.params.id);
    await requireMembership(accountId, userId);

    const members = await AppDataSource.getRepository(SharedAccountMember).find({
      where: { shared_account_id: accountId },
    });
    const active = members.filter((m) => !m.left_at);
    const users = await usersByIds(active.map((m) => m.user_id));
    res.json({ members: active.map((m) => memberView(m, new Map(users.map((u) => [u.id, u])))) });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/shared-accounts/:id/members  { user_id, role }
router.post('/:id/members', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const accountId = Number(req.params.id);
    const membership = await requireMembership(accountId, userId);
    if (!isManagementRole(membership.role)) {
      throw new AppError('Solo propietario o administrador pueden invitar miembros', 403);
    }

    const { user_id, role = 'member' } = req.body ?? {};
    const targetId = Number(user_id);
    if (!Number.isFinite(targetId) || targetId <= 0) throw new AppError('Usuario inválido', 400);
    if (!MEMBER_ROLES.includes(role)) throw new AppError('Rol inválido', 400);
    if (role === 'owner') throw new AppError('No se puede asignar el rol de propietario', 400);
    if (targetId === userId) throw new AppError('Ya eres miembro de esta cuenta', 400);

    if (!(await areFriends(userId, targetId))) {
      throw new AppError('Solo puedes agregar a tus amigos', 403);
    }

    const repo = AppDataSource.getRepository(SharedAccountMember);
    const existing = await repo.findOne({ where: { shared_account_id: accountId, user_id: targetId } });

    let member: SharedAccountMember;
    if (existing) {
      existing.left_at = null;
      existing.role = role;
      member = await repo.save(existing);
    } else {
      member = await repo.save(
        repo.create({ shared_account_id: accountId, user_id: targetId, role }),
      );
    }

    await logActivity('shared_account', accountId, userId, 'member_added', {
      member: targetId,
      role,
    });

    const users = await usersByIds([targetId]);
    res.status(201).json({
      member: memberView(member, new Map(users.map((u) => [u.id, u]))),
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/v1/shared-accounts/:id/members/:userId  { role }
router.put('/:id/members/:userId', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const accountId = Number(req.params.id);
    const membership = await requireMembership(accountId, userId);
    if (membership.role !== 'owner') {
      throw new AppError('Solo el propietario puede cambiar roles', 403);
    }

    const targetId = Number(req.params.userId);
    const { role } = req.body ?? {};
    if (!MEMBER_ROLES.includes(role)) throw new AppError('Rol inválido', 400);

    const repo = AppDataSource.getRepository(SharedAccountMember);
    const member = await repo.findOne({ where: { shared_account_id: accountId, user_id: targetId } });
    if (!member || member.left_at) throw new AppError('Miembro no encontrado', 404);
    if (member.role === 'owner') throw new AppError('No se puede cambiar el rol del propietario', 400);

    member.role = role;
    await repo.save(member);
    await logActivity('shared_account', accountId, userId, 'member_role_changed', {
      member: targetId,
      role,
    });
    res.json({ member: memberView(member, new Map()) });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/shared-accounts/:id/members/:userId  (leave or remove)
router.delete('/:id/members/:userId', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const accountId = Number(req.params.id);
    const membership = await requireMembership(accountId, userId);
    const targetId = Number(req.params.userId);

    const isSelf = targetId === userId;
    if (!isSelf && !isManagementRole(membership.role)) {
      throw new AppError('No puedes quitar a este miembro', 403);
    }

    const repo = AppDataSource.getRepository(SharedAccountMember);
    const member = await repo.findOne({ where: { shared_account_id: accountId, user_id: targetId } });
    if (!member || member.left_at) throw new AppError('Miembro no encontrado', 404);
    if (member.role === 'owner') {
      throw new AppError('El propietario no puede salir de la cuenta', 400);
    }

    member.left_at = new Date();
    await repo.save(member);
    await logActivity('shared_account', accountId, userId, isSelf ? 'member_left' : 'member_removed', {
      member: targetId,
    });
    res.json({ message: 'Miembro eliminado' });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/shared-accounts/:id/entries
router.get('/:id/entries', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const accountId = Number(req.params.id);
    await requireMembership(accountId, userId);

    const entries = await AppDataSource.getRepository(SharedEntry).find({
      where: { shared_account_id: accountId },
      order: { date: 'DESC', id: 'DESC' },
    });
    const users = await usersByIds(entries.map((e) => e.user_id));
    res.json({
      entries: entries.map((e) => entryView(e, new Map(users.map((u) => [u.id, u])))),
      balance: computeSharedBalance(entries),
      users,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/shared-accounts/:id/entries  { type, amount, date?, description?, category? }
router.post('/:id/entries', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const accountId = Number(req.params.id);
    const membership = await requireMembership(accountId, userId);
    if (!canWrite(membership.role)) throw new AppError('No tienes permiso para registrar movimientos', 403);

    const { type, amount, date, description, category } = req.body ?? {};
    if (!ENTRY_TYPES.includes(type)) throw new AppError('Tipo de movimiento inválido', 400);
    const value = normalizeAmount(amount);
    const when = toDate(date);

    const repo = AppDataSource.getRepository(SharedEntry);
    const entry = await repo.save(
      repo.create({
        shared_account_id: accountId,
        user_id: userId,
        type,
        amount: value,
        date: when,
        description: description ? String(description).slice(0, 200) : null,
        category: category ? String(category).slice(0, 100) : null,
      }),
    );

    await logActivity('shared_account', accountId, userId, 'entry_created', {
      entry: entry.id,
      type,
      amount: value,
    });
    logger.info(`Shared entry ${entry.id} created in account ${accountId} by ${userId}`);
    res.status(201).json({ entry: entryView(entry, new Map()) });
  } catch (error) {
    next(error);
  }
});

// PUT /api/v1/shared-accounts/:id/entries/:entryId/void
router.put('/:id/entries/:entryId/void', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const accountId = Number(req.params.id);
    const membership = await requireMembership(accountId, userId);
    const entryId = Number(req.params.entryId);

    const repo = AppDataSource.getRepository(SharedEntry);
    const entry = await repo.findOne({ where: { id: entryId, shared_account_id: accountId } });
    if (!entry) throw new AppError('Movimiento no encontrado', 404);
    if (entry.voided_at) throw new AppError('El movimiento ya fue anulado', 409);
    if (entry.user_id !== userId && !isManagementRole(membership.role)) {
      throw new AppError('No puedes anular este movimiento', 403);
    }

    entry.voided_at = new Date();
    await repo.save(entry);
    await logActivity('shared_account', accountId, userId, 'entry_voided', { entry: entryId });
    logger.info(`Shared entry ${entryId} voided by ${userId}`);
    res.json({ entry: entryView(entry, new Map()) });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/shared-accounts/:id/activity
router.get('/:id/activity', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const accountId = Number(req.params.id);
    await requireMembership(accountId, userId);

    const logs = await AppDataSource.getRepository(ActivityLog).find({
      where: { scope: 'shared_account', scope_id: accountId },
      order: { created_at: 'DESC' },
      take: 100,
    });
    res.json({ activity: logs });
  } catch (error) {
    next(error);
  }
});

export { router as sharedAccountsRouter };
