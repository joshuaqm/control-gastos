import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { adjustRealInterest, THEORETICAL_NOTE } from "./interestAccrual";

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

describe("adjustRealInterest", () => {
  it("creates one real income interest transaction", async () => {
    const account = {
      id: 1,
      userId: 5,
      name: "Ahorro",
      type: "savings",
      initial_balance: 1000,
      last_interest_at: null,
    } as Account;

    const accountRepo = fakeRepo();
    accountRepo.findOne.mockResolvedValue(account);
    const transactionRepo = fakeRepo();
    transactionRepo.find.mockResolvedValue([]);
    transactionRepo.create.mockImplementation((obj) => obj as Transaction);
    transactionRepo.save.mockResolvedValue({} as Transaction);
    getRepository.mockImplementation((entity) =>
      entity === Account ? (accountRepo as never) : (transactionRepo as never),
    );

    const result = await adjustRealInterest(1, 5, 60);

    const created = transactionRepo.create.mock.calls[0]?.[0] as Transaction;
    expect(created).toMatchObject({
      type: "income",
      category: "Intereses",
      amount: 60,
      userId: 5,
    });
    expect(transactionRepo.save).toHaveBeenCalledTimes(1);
    expect(transactionRepo.remove).not.toHaveBeenCalled();
    expect(accountRepo.save).toHaveBeenCalledTimes(1);
    expect(result.balanceDelta).toBe(60);
  });

  it("removes legacy theoretical transactions and un-inflates initial_balance", async () => {
    const account = {
      id: 1,
      userId: 5,
      type: "savings",
      initial_balance: 1020,
      last_interest_at: null,
    } as Account;
    const theoretical = [
      { id: 99, amount: 10, notes: THEORETICAL_NOTE, type: "income" },
      { id: 98, amount: 10, notes: THEORETICAL_NOTE, type: "income" },
    ] as Transaction[];
    const income = [...theoretical, { id: 97, amount: 500, notes: "Nómina", type: "income" }] as Transaction[];

    const accountRepo = fakeRepo();
    accountRepo.findOne.mockResolvedValue(account);
    const transactionRepo = fakeRepo();
    transactionRepo.find.mockResolvedValue(income);
    transactionRepo.create.mockImplementation((obj) => obj as Transaction);
    transactionRepo.save.mockResolvedValue({} as Transaction);
    transactionRepo.remove.mockResolvedValue({} as Transaction[]);
    getRepository.mockImplementation((entity) =>
      entity === Account ? (accountRepo as never) : (transactionRepo as never),
    );

    await adjustRealInterest(1, 5, 60);

    expect(transactionRepo.remove).toHaveBeenCalledWith(theoretical);
    expect(account.initial_balance).toBe(1000);
    expect(transactionRepo.save).toHaveBeenCalledTimes(1);
  });

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