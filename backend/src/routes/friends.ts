import { Router, type RequestHandler } from 'express';
import { ILike } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Friendship } from '../models/Friendship';
import { User } from '../models/User';
import { AppError } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';
import { logger } from '../utils/logger';
import { usersByIds, type PublicUser } from '../services/social';

const router = Router();
router.use(authenticate);

interface FriendshipView {
  friendship_id: number;
  user: PublicUser;
  created_at: Date;
  responded_at: Date | null;
}

const toView = (
  friendship: Friendship,
  otherId: number,
  users: Map<number, PublicUser>,
): FriendshipView => ({
  friendship_id: friendship.id,
  user: users.get(otherId) ?? { id: otherId, username: `Usuario ${otherId}` },
  created_at: friendship.created_at,
  responded_at: friendship.responded_at,
});

// GET /api/v1/friends
// Returns { friends, incoming, outgoing } for the authenticated user.
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const repo = AppDataSource.getRepository(Friendship);
    const rows = await repo.find({
      where: [{ requester_id: userId }, { addressee_id: userId }],
    });

    const otherIds = rows.map((r) => (r.requester_id === userId ? r.addressee_id : r.requester_id));
    const userList = await usersByIds(otherIds);
    const users = new Map(userList.map((u) => [u.id, u]));

    const friends: FriendshipView[] = [];
    const incoming: FriendshipView[] = [];
    const outgoing: FriendshipView[] = [];

    for (const row of rows) {
      const otherId = row.requester_id === userId ? row.addressee_id : row.requester_id;
      const view = toView(row, otherId, users);
      if (row.status === 'accepted') {
        friends.push(view);
      } else if (row.status === 'pending') {
        if (row.addressee_id === userId) incoming.push(view);
        else outgoing.push(view);
      }
    }

    res.json({ friends, incoming, outgoing });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/friends/search?q=...  (search by username, or exact email)
router.get('/search', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const q = String(req.query.q ?? '').trim();
    if (q.length < 2) {
      res.json({ results: [] });
      return;
    }

    const users = await AppDataSource.getRepository(User).find({
      where: [{ username: ILike(`%${q}%`) }, { email: q.toLowerCase() }],
      take: 20,
    });

    res.json({
      results: users
        .filter((u) => u.id !== userId && u.is_active)
        .map((u) => ({ id: u.id, username: u.username })),
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/friends/invitations  { username } | { email } | { user_id }
router.post('/invitations', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { username, email, user_id } = req.body ?? {};

    const userRepo = AppDataSource.getRepository(User);
    let target: User | null = null;
    if (user_id) {
      target = await userRepo.findOne({ where: { id: Number(user_id) } });
    } else if (email) {
      target = await userRepo.findOne({ where: { email: String(email).trim().toLowerCase() } });
    } else if (username) {
      target = await userRepo.findOne({ where: { username: String(username).trim() } });
    } else {
      throw new AppError('Debes indicar un usuario', 400);
    }

    if (!target || !target.is_active) {
      throw new AppError('Usuario no encontrado', 404);
    }
    if (target.id === userId) {
      throw new AppError('No puedes agregarte a ti mismo', 400);
    }

    const repo = AppDataSource.getRepository(Friendship);
    const existing = await repo.find({
      where: [
        { requester_id: userId, addressee_id: target.id },
        { requester_id: target.id, addressee_id: userId },
      ],
    });

    if (existing.some((f) => f.status === 'blocked')) {
      throw new AppError('No es posible enviar la invitación', 403);
    }
    if (existing.some((f) => f.status === 'accepted')) {
      throw new AppError('Ya son amigos', 409);
    }
    if (existing.some((f) => f.status === 'pending')) {
      throw new AppError('Ya existe una invitación pendiente', 409);
    }

    const stale = existing.filter((f) => f.status === 'rejected');
    if (stale.length > 0) {
      await repo.remove(stale);
    }

    const created = await repo.save(
      repo.create({ requester_id: userId, addressee_id: target.id, status: 'pending' }),
    );

    logger.info(`Friend invitation ${userId} -> ${target.id}`);
    res.status(201).json(toView(created, target.id, new Map([[target.id, { id: target.id, username: target.username }]])));
  } catch (error) {
    next(error);
  }
});

const respond = (status: 'accepted' | 'rejected'): RequestHandler => async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const id = Number(req.params.id);
    const repo = AppDataSource.getRepository(Friendship);
    const friendship = await repo.findOne({ where: { id } });

    if (!friendship) throw new AppError('Invitación no encontrada', 404);
    if (friendship.addressee_id !== userId) {
      throw new AppError('Solo el destinatario puede responder la invitación', 403);
    }
    if (friendship.status !== 'pending') {
      throw new AppError('La invitación ya fue respondida', 409);
    }

    friendship.status = status;
    friendship.responded_at = new Date();
    await repo.save(friendship);

    logger.info(`Friend invitation ${id} ${status} by ${userId}`);
    res.json(toView(friendship, friendship.requester_id, new Map()));
  } catch (error) {
    next(error);
  }
};

// PUT /api/v1/friends/:id/accept
router.put('/:id/accept', respond('accepted'));
// PUT /api/v1/friends/:id/reject
router.put('/:id/reject', respond('rejected'));

// PUT /api/v1/friends/:id/block
router.put('/:id/block', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const id = Number(req.params.id);
    const repo = AppDataSource.getRepository(Friendship);
    const friendship = await repo.findOne({ where: { id } });

    if (!friendship) throw new AppError('Relación no encontrada', 404);
    if (friendship.requester_id !== userId && friendship.addressee_id !== userId) {
      throw new AppError('No participas en esta relación', 403);
    }

    friendship.status = 'blocked';
    friendship.responded_at = new Date();
    await repo.save(friendship);

    logger.info(`Friendship ${id} blocked by ${userId}`);
    res.json({ message: 'Usuario bloqueado' });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/friends/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const id = Number(req.params.id);
    const repo = AppDataSource.getRepository(Friendship);
    const friendship = await repo.findOne({ where: { id } });

    if (!friendship) throw new AppError('Relación no encontrada', 404);
    if (friendship.requester_id !== userId && friendship.addressee_id !== userId) {
      throw new AppError('No participas en esta relación', 403);
    }

    await repo.remove(friendship);
    logger.info(`Friendship ${id} removed by ${userId}`);
    res.json({ message: 'Amistad eliminada' });
  } catch (error) {
    next(error);
  }
});

export { router as friendsRouter };
