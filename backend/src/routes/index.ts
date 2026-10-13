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
import { friendsRouter } from './friends';
import { sharedAccountsRouter } from './sharedAccounts';
import { peerLoansRouter } from './peerLoans';
import { sharedGoalsRouter } from './sharedGoals';

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
router.use('/friends', friendsRouter);
router.use('/shared-accounts', sharedAccountsRouter);
router.use('/peer-loans', peerLoansRouter);
router.use('/shared-goals', sharedGoalsRouter);

export default router;