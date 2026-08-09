import { Router } from 'express';
import { healthRouter } from './health';
import { transactionsRouter } from './transactions';
import { accountsRouter } from './accounts';
import { authRouter } from './auth';

const router = Router();

// Health check
router.use('/health', healthRouter);

// API routes
router.use('/transactions', transactionsRouter);
router.use('/accounts', accountsRouter);
router.use('/auth', authRouter);

// TODO: Add more routes as needed
// router.use('/debts', debtsRouter);
// router.use('/budgets', budgetsRouter);
// router.use('/investments', investmentsRouter);
// router.use('/auth', authRouter);

export default router;