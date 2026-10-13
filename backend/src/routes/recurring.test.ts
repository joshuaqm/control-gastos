import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { recurringRouter } from "./recurring";
import { RecurringTransaction } from "../models/RecurringTransaction";
import { Transaction } from "../models/Transaction";
import { buildApp } from "../test/helpers";
import { applyCreate } from "../services/recalcBalance";

vi.mock("../config/database", () => ({
  AppDataSource: { getRepository: vi.fn() },
}));

vi.mock("../utils/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("../services/recalcBalance", () => ({
  applyCreate: vi.fn().mockResolvedValue(undefined),
  adjustAccountBalance: vi.fn().mockResolvedValue(undefined),
}));

import { AppDataSource } from "../config/database";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_key";
const getRepository = vi.mocked(AppDataSource.getRepository);

function makeToken(id = 1) {
  return jwt.sign({ id, username: "testuser", email: "test@finance.com" }, JWT_SECRET, {
    expiresIn: "1h",
  });
}

const recurring = () => ({
  id: 10,
  userId: 1,
  name: "Netflix",
  amount: 200,
  frequency: "monthly",
  interval_days: null,
  next_date: "2026-08-01",
  category: "Suscripciones",
  budget_type: null,
  account_id: 3,
  is_active: true,
});

beforeEach(() => {
  getRepository.mockReset();
  vi.mocked(applyCreate).mockClear();
});

describe("POST /api/v1/recurring/:id/register", () => {
  it("creates the expense and debits the account via applyCreate (BUG-01)", async () => {
    const rec = recurring();
    const recurringRepo = {
      findOne: vi.fn().mockResolvedValue(rec),
      save: vi.fn().mockResolvedValue(rec),
    };
    const created = {
      id: 99,
      amount: 200,
      type: "expense",
      account_id: 3,
    };
    const transactionRepo = {
      find: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockReturnValue(created),
      save: vi.fn().mockResolvedValue(created),
    };
    getRepository.mockImplementation((entity) =>
      entity === RecurringTransaction
        ? (recurringRepo as never)
        : (transactionRepo as never),
    );

    const app = buildApp(recurringRouter);
    const res = await request(app)
      .post("/10/register")
      .set("Authorization", `Bearer ${makeToken()}`)
      .send({ account_id: 3, date: "2026-08-01" });

    expect(res.status).toBe(201);
    expect(applyCreate).toHaveBeenCalledWith(1, created);
    expect(recurringRepo.save).toHaveBeenCalled();
  });

  it("refuses to book the same recurring charge twice for the same day", async () => {
    const rec = recurring();
    const recurringRepo = {
      findOne: vi.fn().mockResolvedValue(rec),
      save: vi.fn(),
    };
    const transactionRepo = {
      find: vi.fn().mockResolvedValue([
        { id: 5, recurring_id: 10, date: "2026-08-01" } as Transaction,
      ]),
      create: vi.fn(),
      save: vi.fn(),
    };
    getRepository.mockImplementation((entity) =>
      entity === RecurringTransaction
        ? (recurringRepo as never)
        : (transactionRepo as never),
    );

    const app = buildApp(recurringRouter);
    const res = await request(app)
      .post("/10/register")
      .set("Authorization", `Bearer ${makeToken()}`)
      .send({ account_id: 3, date: "2026-08-01" });

    expect(res.status).toBe(409);
    expect(transactionRepo.save).not.toHaveBeenCalled();
    expect(applyCreate).not.toHaveBeenCalled();
  });
});
