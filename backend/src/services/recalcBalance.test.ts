import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("../config/database", () => ({
  AppDataSource: { getRepository: vi.fn() },
}));

import { AppDataSource } from "../config/database";
import { Account } from "../models/Account";
import { Transaction } from "../models/Transaction";
import { adjustAccountBalance, applyCreate, applyDelete } from "./recalcBalance";

const getRepository = vi.mocked(AppDataSource.getRepository);

function fakeRepo(overrides: Partial<Record<string, Mock>> = {}) {
  return {
    findOne: vi.fn(),
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

const txn = (partial: Partial<Transaction>): Transaction =>
  ({
    amount: 0,
    type: "expense",
    account_id: null,
    destination_account_id: null,
    ...partial,
  }) as Transaction;

beforeEach(() => {
  getRepository.mockReset();
});

describe("adjustAccountBalance", () => {
  it("adjusts a non-credit account balance incrementally", async () => {
    const account = { id: 1, userId: 5, type: "debit", initial_balance: 100 } as Account;
    const repo = fakeRepo({ findOne: vi.fn().mockResolvedValue(account) });
    getRepository.mockReturnValue(repo as never);

    await adjustAccountBalance(1, 5, -40);

    expect(account.initial_balance).toBe(60);
    expect(repo.save).toHaveBeenCalledWith(account);
  });

  it("never mutates a credit account balance (BUG-03/04)", async () => {
    const card = { id: 4, userId: 5, type: "credit", initial_balance: 0 } as Account;
    const repo = fakeRepo({ findOne: vi.fn().mockResolvedValue(card) });
    getRepository.mockReturnValue(repo as never);

    await adjustAccountBalance(4, 5, 1000);

    expect(card.initial_balance).toBe(0);
    expect(repo.save).not.toHaveBeenCalled();
  });
});

describe("applyCreate / applyDelete on credit cards", () => {
  it("does not touch the card on a credit purchase", async () => {
    const card = { id: 4, userId: 5, type: "credit", initial_balance: 0 } as Account;
    const repo = fakeRepo({ findOne: vi.fn().mockResolvedValue(card) });
    getRepository.mockReturnValue(repo as never);

    await applyCreate(5, txn({ type: "expense", amount: 1500, account_id: 4 }));

    expect(card.initial_balance).toBe(0);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it("debits the bank and ignores the card on a card payment", async () => {
    const bank = { id: 1, userId: 5, type: "debit", initial_balance: 5000 } as Account;
    const card = { id: 4, userId: 5, type: "credit", initial_balance: 0 } as Account;
    const repo = fakeRepo({
      findOne: vi.fn().mockImplementation(({ where }: { where: { id: number } }) =>
        Promise.resolve(where.id === 1 ? bank : card),
      ),
    });
    getRepository.mockReturnValue(repo as never);

    await applyDelete(
      5,
      txn({ type: "transfer", amount: 500, account_id: 1, destination_account_id: 4 }),
    );

    // Deleting a payment refunds the bank (+500) and leaves the card untouched.
    expect(bank.initial_balance).toBe(5500);
    expect(card.initial_balance).toBe(0);
  });
});
