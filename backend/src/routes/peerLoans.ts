import { Router } from 'express';
import { AppDataSource } from '../config/database';
import { PeerLoan } from '../models/PeerLoan';
import { PeerLoanPayment } from '../models/PeerLoanPayment';
import { AppError } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';
import { logger } from '../utils/logger';
import { areFriends, logActivity, usersByIds, type PublicUser } from '../services/social';

const router = Router();
router.use(authenticate);

const round2 = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

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

export const computePending = (original: number | string, payments: PeerLoanPayment[]): number => {
  const paid = payments
    .filter((p) => !p.voided_at)
    .reduce((sum, p) => sum + Number(p.amount), 0);
  return round2(Number(original) - paid);
};

const paymentView = (payment: PeerLoanPayment, users: Map<number, PublicUser>) => ({
  ...payment,
  amount: Number(payment.amount),
  user: users.get(payment.payer_id) ?? { id: payment.payer_id, username: `Usuario ${payment.payer_id}` },
});

const loanView = (
  loan: PeerLoan,
  payments: PeerLoanPayment[],
  users: Map<number, PublicUser>,
) => ({
  ...loan,
  original_amount: Number(loan.original_amount),
  paid_amount: round2(Number(loan.original_amount) - computePending(loan.original_amount, payments)),
  pending_amount: computePending(loan.original_amount, payments),
  lender: users.get(loan.lender_id) ?? { id: loan.lender_id, username: `Usuario ${loan.lender_id}` },
  borrower:
    users.get(loan.borrower_id) ?? { id: loan.borrower_id, username: `Usuario ${loan.borrower_id}` },
  payments: payments.map((p) => paymentView(p, users)),
});

const requireParticipant = async (loanId: number, userId: number): Promise<PeerLoan> => {
  const loan = await AppDataSource.getRepository(PeerLoan).findOne({ where: { id: loanId } });
  if (!loan) throw new AppError('Préstamo no encontrado', 404);
  if (loan.lender_id !== userId && loan.borrower_id !== userId) {
    throw new AppError('No participas en este préstamo', 403);
  }
  return loan;
};

// GET /api/v1/peer-loans
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const loanRepo = AppDataSource.getRepository(PeerLoan);
    const loans = await loanRepo.find({
      where: [{ lender_id: userId }, { borrower_id: userId }],
      order: { created_at: 'DESC' },
    });
    if (loans.length === 0) {
      res.json({ loans: [], users: [] });
      return;
    }

    const loanIds = loans.map((l) => l.id);
    const payments = await AppDataSource.getRepository(PeerLoanPayment).find({
      where: loanIds.map((peer_loan_id) => ({ peer_loan_id })),
    });
    const userIds = [...loans.flatMap((l) => [l.lender_id, l.borrower_id]), ...payments.map((p) => p.payer_id)];
    const users = await usersByIds(userIds);
    const userMap = new Map(users.map((u) => [u.id, u]));

    res.json({
      loans: loans.map((loan) =>
        loanView(loan, payments.filter((p) => p.peer_loan_id === loan.id), userMap),
      ),
      users,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/peer-loans  { borrower_id, original_amount, description?, start_date?, due_date? }
router.post('/', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { borrower_id, original_amount, description, start_date, due_date } = req.body ?? {};

    const borrowerId = Number(borrower_id);
    if (!Number.isFinite(borrowerId) || borrowerId <= 0) throw new AppError('Prestatario inválido', 400);
    if (borrowerId === userId) throw new AppError('No puedes prestarte a ti mismo', 400);
    if (!(await areFriends(userId, borrowerId))) {
      throw new AppError('Solo puedes prestar a tus amigos', 403);
    }
    const amount = normalizeAmount(original_amount);

    const repo = AppDataSource.getRepository(PeerLoan);
    const loan = await repo.save(
      repo.create({
        lender_id: userId,
        borrower_id: borrowerId,
        original_amount: amount,
        description: description ? String(description).slice(0, 200) : null,
        start_date: toDate(start_date),
        due_date: due_date ? toDate(due_date) : null,
        status: 'open',
      }),
    );

    await logActivity('peer_loan', loan.id, userId, 'loan_created', { amount });
    logger.info(`Peer loan ${loan.id} created by ${userId} for ${borrowerId}`);

    const users = await usersByIds([userId, borrowerId]);
    res.status(201).json({
      loan: loanView(loan, [], new Map(users.map((u) => [u.id, u]))),
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/peer-loans/:id
router.get('/:id', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const loanId = Number(req.params.id);
    const loan = await requireParticipant(loanId, userId);

    const payments = await AppDataSource.getRepository(PeerLoanPayment).find({
      where: { peer_loan_id: loanId },
      order: { date: 'DESC', id: 'DESC' },
    });
    const users = await usersByIds([loan.lender_id, loan.borrower_id, ...payments.map((p) => p.payer_id)]);

    res.json({ loan: loanView(loan, payments, new Map(users.map((u) => [u.id, u]))) });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/peer-loans/:id/payments  { amount, date?, method?, note? }
router.post('/:id/payments', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const loanId = Number(req.params.id);
    const loan = await requireParticipant(loanId, userId);
    if (loan.status === 'cancelled') throw new AppError('El préstamo está cancelado', 409);

    const { amount, date, method, note } = req.body ?? {};
    const value = normalizeAmount(amount);

    const repo = AppDataSource.getRepository(PeerLoanPayment);
    const payment = await repo.save(
      repo.create({
        peer_loan_id: loanId,
        payer_id: userId,
        amount: value,
        date: toDate(date),
        method: method ? String(method).slice(0, 50) : null,
        note: note ? String(note).slice(0, 200) : null,
      }),
    );

    const payments = await repo.find({ where: { peer_loan_id: loanId } });
    const pending = computePending(loan.original_amount, payments);
    if (pending <= 0 && loan.status === 'open') {
      loan.status = 'settled';
      await AppDataSource.getRepository(PeerLoan).save(loan);
    }

    await logActivity('peer_loan', loanId, userId, 'payment_recorded', { amount: value });
    logger.info(`Payment ${payment.id} on loan ${loanId} by ${userId}`);

    const users = await usersByIds([loan.lender_id, loan.borrower_id]);
    res.status(201).json({
      loan: loanView(loan, payments, new Map(users.map((u) => [u.id, u]))),
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/v1/peer-loans/:id/payments/:paymentId/void
router.put('/:id/payments/:paymentId/void', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const loanId = Number(req.params.id);
    const loan = await requireParticipant(loanId, userId);
    const paymentId = Number(req.params.paymentId);

    const repo = AppDataSource.getRepository(PeerLoanPayment);
    const payment = await repo.findOne({ where: { id: paymentId, peer_loan_id: loanId } });
    if (!payment) throw new AppError('Pago no encontrado', 404);
    if (payment.voided_at) throw new AppError('El pago ya fue anulado', 409);
    if (payment.payer_id !== userId && loan.lender_id !== userId) {
      throw new AppError('No puedes anular este pago', 403);
    }

    payment.voided_at = new Date();
    await repo.save(payment);

    const payments = await repo.find({ where: { peer_loan_id: loanId } });
    const pending = computePending(loan.original_amount, payments);
    if (loan.status === 'settled' && pending > 0) {
      loan.status = 'open';
      await AppDataSource.getRepository(PeerLoan).save(loan);
    }

    await logActivity('peer_loan', loanId, userId, 'payment_voided', { payment: paymentId });
    logger.info(`Payment ${paymentId} voided by ${userId}`);

    const users = await usersByIds([loan.lender_id, loan.borrower_id]);
    res.json({ loan: loanView(loan, payments, new Map(users.map((u) => [u.id, u]))) });
  } catch (error) {
    next(error);
  }
});

// PUT /api/v1/peer-loans/:id/settle
router.put('/:id/settle', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const loanId = Number(req.params.id);
    const loan = await requireParticipant(loanId, userId);
    if (loan.lender_id !== userId) {
      throw new AppError('Solo el prestamista puede liquidar el préstamo', 403);
    }

    loan.status = 'settled';
    await AppDataSource.getRepository(PeerLoan).save(loan);
    await logActivity('peer_loan', loanId, userId, 'loan_settled');
    res.json({ loan: { ...loan, original_amount: Number(loan.original_amount) } });
  } catch (error) {
    next(error);
  }
});

export { router as peerLoansRouter };
