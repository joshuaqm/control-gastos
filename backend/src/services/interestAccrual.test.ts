import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Mock } from "vitest";
import { accrueWeeklyInterest, adjustRealInterest, THEORETICAL_NOTE } from "./interestAccrual";

vi.mock("../config/database", () => ({
  AppDataSource: {
    getRepository: vi.fn(),
  },
}));

vi.mock("../utils/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { AppDataSource } from "../config/database";
import { Account } from "../models/Account";
import { Transaction } from "../models/Transaction";

const getRepository = vi.mocked(AppDataSource.getRepository);

interface MockRepository {
  find: Mock;
  findOne: Mock;
  create: Mock;
  save: Mock;
  remove: Mock;
}

function fakeRepo(overrides: Partial<Record<string, Mock>> = {}): MockRepository {
  return {
    find: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
    remove: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  getRepository.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("accrueWeeklyInterest", () => {
  it("creates one income interest transaction per elapsed week on the balance", async () => {
    const account = {
      id: 1,
      userId: 5,
      name: "Ahorro",
      type: "savings",
      interest_rate: 5.2,
      initial_balance: 1000,
      created_at: new Date("2026-07-01"),
      last_interest_at: null,
      is_active: true,
    } as Account;

    const accountRepo = fakeRepo();
    accountRepo.find.mockResolvedValue([account]);
    const transactionRepo = fakeRepo();
    transactionRepo.create.mockImplementation((obj) => obj as Transaction);
    transactionRepo.save.mockResolvedValue([]);

    getRepository.mockImplementation((entity) =>
      entity === Account ? (accountRepo as never) : (transactionRepo as never),
    );

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-10T12:00:00"));

    const accountId = account.id;
    const results = await accrueWeeklyInterest();

    const created = transactionRepo.save.mock.calls[0]?.[0] as Transaction[];
    expect(results.length).toBe(1);
    expect(results[0]).toMatchObject({ accountId: accountId });

    // 40 days -> 5 full weeks
    expect(created.length).toBe(5);
    expect(created[0]).toMatchObject({
      type: "income",
      category: "Intereses",
      notes: THEORETICAL_NOTE,
      userId: 5,
    });
    // compound: weekly rate 5.2% / 52
    expect(created[0].amount).toBeCloseTo(1000 * (5.2 / 100 / 52), 2);
    expect(account.initial_balance).toBeGreaterThan(1000);
  });

  it("skips accounts without an interest rate or credit cards", async () => {
    const debit = {
      id: 2,
      userId: 5,
      type: "debit",
      interest_rate: null,
      is_active: true,
    } as Account;
    const credit = {
      id: 3,
      userId: 5,
      type: "credit",
      interest_rate: 30,
      is_active: true,
    } as Account;
    const accountRepo = fakeRepo();
    accountRepo.find.mockResolvedValue([debit, credit]);

    getRepository.mockImplementation((entity) =>
      entity === Account ? (accountRepo as never) : (fakeRepo() as never),
    );

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-10T12:00:00"));

    const results = await accrueWeeklyInterest();
    expect(results).toEqual([]);
  });

  it("caps accrual at 52 weeks after long downtime", async () => {
    const account = {
      id: 4,
      userId: 5,
      name: "Ahorro",
      type: "savings",
      interest_rate: 5,
      initial_balance: 100,
      created_at: new Date("2020-01-01"),
      last_interest_at: null,
      is_active: true,
    } as Account;

    const accountRepo = fakeRepo();
    accountRepo.find.mockResolvedValue([account]);
    const transactionRepo = fakeRepo();
    transactionRepo.create.mockImplementation((obj) => obj as Transaction);
    transactionRepo.save.mockResolvedValue([]);
    getRepository.mockImplementation((entity) =>
      entity === Account ? (accountRepo as never) : (transactionRepo as never),
    );

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-10T12:00:00"));

    const results = await accrueWeeklyInterest();
    const created = transactionRepo.save.mock.calls[0]?.[0] as Transaction[];
    expect(created.length).toBe(52);
    expect(results[0].weeks).toBe(52);
  });
});

describe("adjustRealInterest", () => {
  it("throws when the account is a credit card", async () => {
    const accountRepo = fakeRepo();
    accountRepo.findOne.mockResolvedValue({ id: 9, type: "credit" } as Account);
    getRepository.mockImplementation((entity) =>
      entity === Account ? (accountRepo as never) : (fakeRepo() as never),
    );

    await expect(adjustRealInterest(9, 5, 100)).rejects.toThrow(
      "No aplica a una tarjeta de crédito",
    );
  });

  it("rejects non-numeric or <= 0 amounts", async () => {
    const accountRepo = fakeRepo();
    accountRepo.findOne.mockResolvedValue({ id: 1, type: "debit" } as Account);
    getRepository.mockReturnValue(accountRepo as never);

    await expect(adjustRealInterest(1, 5, 0)).rejects.toThrow("Ingresa un monto válido");
    await expect(adjustRealInterest(1, 5, Number.NaN)).rejects.toThrow("Ingresa un monto válido");
  });
});
