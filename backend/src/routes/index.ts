import { Router } from 'express';
import { healthRouter } from './health';
import { transactionsRouter } from './transactions';
import { accountsRouter } from './accounts';
import { authRouter } from './auth';
import { budgetsRouter } from './budgets';
import { debtsRouter } from './debts';
import { receivablesRouter } from './receivables';
import { installmentsRouter } from './installments';
import { investmentsRouter } from './investments';
import { recurringRouter } from './recurring';
import { goalsRouter } from './goals';
import { settingsRouter } from './settings';

const router = Router();

// Health check
router.use('/health', healthRouter);

// API routes
router.use('/transactions', transactionsRouter);
router.use('/accounts', accountsRouter);
router.use('/auth', authRouter);
router.use('/budgets', budgetsRouter);
router.use('/debts', debtsRouter);
router.use('/receivables', receivablesRouter);
router.use('/installments', installmentsRouter);
router.use('/investments', investmentsRouter);
router.use('/recurring', recurringRouter);
router.use('/goals', goalsRouter);
router.use('/settings', settingsRouter);

export default router;