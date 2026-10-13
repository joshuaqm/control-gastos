import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { peerLoansRouter, computePending } from "./peerLoans";
import { PeerLoan } from "../models/PeerLoan";
import { PeerLoanPayment } from "../models/PeerLoanPayment";
import { buildApp } from "../test/helpers";

vi.mock("../config/database", () => ({
  AppDataSource: { getRepository: vi.fn() },
}));

vi.mock("../utils/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { AppDataSource } from "../config/database";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_key";
const getRepository = vi.mocked(AppDataSource.getRepository);

const makeToken = (id = 1) =>
  jwt.sign({ id, username: "testuser", email: "test@finance.com" }, JWT_SECRET, { expiresIn: "1h" });

const payment = (over: Partial<PeerLoanPayment>) =>
  ({ amount: 100, voided_at: null, ...over }) as PeerLoanPayment;

beforeEach(() => {
  getRepository.mockReset();
});

describe("computePending", () => {
  it("subtracts only active (non-voided) payments from the original amount", () => {
    const pending = computePending(1000, [
      payment({ amount: 300 }),
      payment({ amount: 200 }),
      payment({ amount: 500, voided_at: new Date() }),
    ]);
    expect(pending).toBe(500);
  });

  it("can go negative when the borrower overpays", () => {
    expect(computePending(100, [payment({ amount: 150 })])).toBe(-50);
  });
});

describe("peer loan authorization", () => {
  it("rejects recording a payment when the user is not a participant (403)", async () => {
    const loanRepo = {
      findOne: vi.fn().mockResolvedValue({ id: 5, lender_id: 2, borrower_id: 3, status: "open" }),
      save: vi.fn(),
    };
    getRepository.mockImplementation((entity) => (entity === PeerLoan ? (loanRepo as never) : ({} as never)));

    const app = buildApp(peerLoansRouter);
    const res = await request(app)
      .post("/5/payments")
      .set("Authorization", `Bearer ${makeToken(1)}`)
      .send({ amount: 50 });

    expect(res.status).toBe(403);
    expect(loanRepo.save).not.toHaveBeenCalled();
  });

  it("only lets the lender settle a loan (borrower gets 403)", async () => {
    const loanRepo = {
      findOne: vi.fn().mockResolvedValue({ id: 5, lender_id: 2, borrower_id: 1, status: "open" }),
      save: vi.fn(),
    };
    getRepository.mockImplementation((entity) => (entity === PeerLoan ? (loanRepo as never) : ({} as never)));

    const app = buildApp(peerLoansRouter);
    const res = await request(app)
      .put("/5/settle")
      .set("Authorization", `Bearer ${makeToken(1)}`);

    expect(res.status).toBe(403);
    expect(loanRepo.save).not.toHaveBeenCalled();
  });

  it("marks the loan settled automatically once the balance reaches zero", async () => {
    const loan = { id: 5, lender_id: 1, borrower_id: 2, original_amount: 100, status: "open" };
    const loanRepo = { findOne: vi.fn().mockResolvedValue(loan), save: vi.fn().mockResolvedValue(loan) };
    const saved = { id: 9, peer_loan_id: 5, payer_id: 1, amount: 100, voided_at: null };
    const paymentRepo = {
      create: vi.fn().mockReturnValue(saved),
      save: vi.fn().mockResolvedValue(saved),
      find: vi.fn().mockResolvedValue([saved]),
    };
    getRepository.mockImplementation((entity) =>
      entity === PeerLoan ? (loanRepo as never) : (paymentRepo as never),
    );

    const app = buildApp(peerLoansRouter);
    const res = await request(app)
      .post("/5/payments")
      .set("Authorization", `Bearer ${makeToken(1)}`)
      .send({ amount: 100 });

    expect(res.status).toBe(201);
    expect(loanRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: "settled" }));
  });
});
