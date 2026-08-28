import { Router } from 'express';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import * as bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../config/database';
import { User } from '../models/User';
import { PasswordResetToken } from '../models/PasswordResetToken';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { sendEmail, buildPasswordResetEmail } from '../services/email';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const RESET_TOKEN_EXPIRY_MINUTES = 20;

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

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  handler: (req, res) => {
    res.status(429).json({ error: 'Too many requests. Try again later.' });
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

    logger.info(`User logged in: ${user.email}`);
    res.json({ user: toSafeUser(user), token: signToken(user) });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/auth/forgot-password
// Sends a reset email only if the user exists. Always returns 200 to prevent email enumeration.
router.post('/forgot-password', forgotPasswordLimiter, async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      throw new AppError('Email is required', 400);
    }

    const userRepo = AppDataSource.getRepository(User);
    const tokenRepo = AppDataSource.getRepository(PasswordResetToken);

    const user = await userRepo.findOne({ where: { email: email.trim().toLowerCase() } });

    if (user) {
      // Invalidate any existing unused tokens for this user
      const existingTokens = await tokenRepo.find({ where: { userId: user.id, used: false } });
      for (const t of existingTokens) {
        t.used = true;
      }
      await tokenRepo.save(existingTokens);

      // Generate new token
      const rawToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + RESET_TOKEN_EXPIRY_MINUTES);

      const resetToken = tokenRepo.create({
        userId: user.id,
        token: hashedToken,
        expiresAt,
        used: false,
      });
      await tokenRepo.save(resetToken);

      // Send email
      const resetUrl = `${FRONTEND_URL}/reset-password?token=${rawToken}`;
      const { subject, html } = buildPasswordResetEmail({
        username: user.username,
        resetUrl,
        expiresIn: `${RESET_TOKEN_EXPIRY_MINUTES} minutos`,
      });

      await sendEmail({ to: user.email, subject, html });
      logger.info(`Password reset requested for ${user.email}`);
    } else {
      logger.info(`Password reset requested for non-existent email: ${email}`);
    }

    // Always return success to prevent email enumeration
    res.json({ message: 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.' });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/auth/reset-password
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      throw new AppError('Token and new password are required', 400);
    }
    if (String(newPassword).length < 6) {
      throw new AppError('La nueva contraseña debe tener al menos 6 caracteres', 400);
    }

    const tokenRepo = AppDataSource.getRepository(PasswordResetToken);
    const userRepo = AppDataSource.getRepository(User);

    // Hash the raw token to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(String(token)).digest('hex');

    const resetToken = await tokenRepo.findOne({
      where: { token: hashedToken, used: false },
      order: { createdAt: 'DESC' },
    });

    if (!resetToken) {
      throw new AppError('Token inválido o ya utilizado', 400);
    }

    if (new Date() > resetToken.expiresAt) {
      throw new AppError('El token ha expirado. Solicita uno nuevo.', 400);
    }

    // Mark token as used (single-use)
    resetToken.used = true;
    await tokenRepo.save(resetToken);

    // Update password
    const user = await userRepo.findOne({ where: { id: resetToken.userId } });
    if (!user) {
      throw new AppError('Usuario no encontrado', 404);
    }

    user.password_hash = bcrypt.hashSync(String(newPassword), 12);
    await userRepo.save(user);

    logger.info(`Password reset completed for ${user.email}`);
    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    next(error);
  }
});

export { router as authRouter };
