import { Router } from 'express';
import { healthRouter } from './health';
import { transactionsRouter } from './transactions';
import { accountsRouter } from './accounts';

const router = Router();

// Health check
router.use('/health', healthRouter);

// API routes
router.use('/transactions', transactionsRouter);
router.use('/accounts', accountsRouter);

// TODO: Add more routes as needed
// router.use('/debts', debtsRouter);
// router.use('/budgets', budgetsRouter);
// router.use('/investments', investmentsRouter);
// router.use('/auth', authRouter);

export default router;