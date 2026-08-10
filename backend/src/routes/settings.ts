import { Router } from 'express';
import * as bcrypt from 'bcryptjs';
import { AppDataSource } from '../config/database';
import { User } from '../models/User';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();

router.use(authenticate);

const toNum = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const round2 = (n: number): number => Math.round(n * 100) / 100;

// GET /api/v1/settings — global user settings
router.get('/', async (req, res, next) => {
  try {
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: req.user!.id } });

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    res.json({
      username: user.username,
      email: user.email,
      currency: user.currency,
      notifications_enabled: user.notifications_enabled,
      monthly_income: user.monthly_income != null ? Number(user.monthly_income) : null,
      is_active: user.is_active,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/v1/settings — update global user settings
router.put('/', async (req, res, next) => {
  try {
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: req.user!.id } });

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    const { username, email, currency, notifications_enabled, monthly_income } = req.body ?? {};

    if (username !== undefined) {
      const name = String(username).trim();
      if (!name) throw new AppError('El nombre de usuario no puede estar vacío', 400);
      const existing = await userRepo.findOne({ where: { username: name } });
      if (existing && existing.id !== user.id) {
        throw new AppError('Ese nombre de usuario ya está en uso', 409);
      }
      user.username = name;
    }

    if (email !== undefined) {
      const mail = String(email).trim().toLowerCase();
      if (!mail || !mail.includes('@')) throw new AppError('Correo electrónico inválido', 400);
      const existing = await userRepo.findOne({ where: { email: mail } });
      if (existing && existing.id !== user.id) {
        throw new AppError('Ese correo ya está registrado', 409);
      }
      user.email = mail;
    }

    if (currency !== undefined) {
      const cur = String(currency).trim().toUpperCase();
      if (!cur) throw new AppError('Moneda inválida', 400);
      user.currency = cur;
    }

    if (notifications_enabled !== undefined) {
      user.notifications_enabled = !!notifications_enabled;
    }

    if (monthly_income !== undefined) {
      const value = toNum(monthly_income);
      if (!(value >= 0)) throw new AppError('Ingreso mensual inválido', 400);
      user.monthly_income = round2(value);
    }

    await userRepo.save(user);

    logger.info(`Settings updated (user ${user.id})`);
    res.json({
      username: user.username,
      email: user.email,
      currency: user.currency,
      notifications_enabled: user.notifications_enabled,
      monthly_income: user.monthly_income != null ? Number(user.monthly_income) : null,
      is_active: user.is_active,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/v1/settings/password — change password
router.put('/password', async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body ?? {};

    if (!currentPassword || !newPassword) {
      throw new AppError('Indica la contraseña actual y la nueva', 400);
    }
    if (String(newPassword).length < 6) {
      throw new AppError('La nueva contraseña debe tener al menos 6 caracteres', 400);
    }

    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: req.user!.id } });

    if (!user) {
      return next(new AppError('User not found', 404));
    }
    if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
      throw new AppError('La contraseña actual es incorrecta', 401);
    }

    user.password_hash = bcrypt.hashSync(String(newPassword), 12);
    await userRepo.save(user);

    logger.info(`Password changed (user ${user.id})`);
    res.json({ message: 'Contraseña actualizada' });
  } catch (error) {
    next(error);
  }
});

export { router as settingsRouter };