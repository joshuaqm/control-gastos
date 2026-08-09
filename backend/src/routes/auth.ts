import { Router } from 'express';
import * as bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../config/database';
import { User } from '../models/User';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

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

// POST /api/v1/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

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
    const user = userRepo.create({ username, email, password_hash, is_active: true });
    await userRepo.save(user);

    logger.info(`✅ User registered: ${user.email}`);
    res.status(201).json({ user: toSafeUser(user), token: signToken(user) });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/auth/login
router.post('/login', async (req, res, next) => {
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