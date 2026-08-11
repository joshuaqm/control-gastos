import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../config/database';
import { User } from '../models/User';
import { Budget } from '../models/Budget';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  handler: (req, res) => {
    res.status(429).json({ error: 'Too many requests, please try again later' });
  },
});

const signToken = (user: User) =>
  jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
  );

interface SafeUser {
  id: number;
  username: string;
  email: string;
}

const toSafeUser = (user: User): SafeUser => ({
  id: user.id,
  username: user.username,
  email: user.email,
});

const DEFAULT_INCOME = 15000;

const DEFAULT_BUDGETS = [
  { budget_type: 'need', percentage: 50, notes: 'Presupuesto de necesidades' },
  { budget_type: 'want', percentage: 30, notes: 'Presupuesto de deseos' },
  { budget_type: 'save', percentage: 20, notes: 'Ahorro mensual' },
];

async function createDefaultBudgets(user: User): Promise<void> {
  const budgetRepo = AppDataSource.getRepository(Budget);
  const now = new Date();
  const month = new Date(now.getFullYear(), now.getMonth(), 1);
  const income = user.monthly_income && Number(user.monthly_income) > 0
    ? Number(user.monthly_income)
    : DEFAULT_INCOME;

  for (const def of DEFAULT_BUDGETS) {
    const budget = budgetRepo.create({
      userId: user.id,
      month,
      budget_type: def.budget_type,
      percentage: def.percentage,
      target_amount: Math.round((def.percentage / 100) * income * 100) / 100,
      notes: def.notes,
    });
    await budgetRepo.save(budget);
    logger.info(`✅ Default budget created for user ${user.email}: ${def.budget_type}`);
  }
}

// POST /api/v1/auth/register
router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const { username, email, password, monthly_income } = req.body;

    if (!username || !email || !password) {
      throw new AppError('Username, email and password are required', 400);
    }
    if (password.length < 6) {
      throw new AppError('Password must be at least 6 characters', 400);
    }

    const userRepo = AppDataSource.getRepository(User);

    const existing = await userRepo.findOne({
      where: [{ email }, { username }],
    });
    if (existing) {
      throw new AppError('Username or email already exists', 409);
    }

    const password_hash = bcrypt.hashSync(password, 12);
    const user = userRepo.create({
      username,
      email,
      password_hash,
      is_active: true,
      monthly_income: monthly_income !== undefined && Number(monthly_income) > 0
        ? Number(monthly_income)
        : null,
    });
    await userRepo.save(user);

    await createDefaultBudgets(user);

    logger.info(`✅ User registered: ${user.email}`);
    res.status(201).json({ user: toSafeUser(user), token: signToken(user) });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/auth/login
router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('Email and password are required', 400);
    }

    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { email } });

    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      throw new AppError('Invalid credentials', 401);
    }

    if (!user.is_active) {
      throw new AppError('Account is disabled', 403);
    }

    logger.info(`✅ User logged in: ${user.email}`);
    res.json({ user: toSafeUser(user), token: signToken(user) });
  } catch (error) {
    next(error);
  }
});

export { router as authRouter };