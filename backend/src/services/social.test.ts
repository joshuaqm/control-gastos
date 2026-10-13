import { describe, it, expect } from "vitest";
import { entryDelta, computeSharedBalance } from "./social";
import { SharedEntry } from "../models/SharedEntry";

const entry = (over: Partial<SharedEntry>): SharedEntry =>
  ({
    type: "contribution",
    amount: 100,
    voided_at: null,
    ...over,
  }) as SharedEntry;

describe("entryDelta", () => {
  it("adds contributions and subtracts everything that leaves", () => {
    expect(entryDelta("contribution", 100)).toBe(100);
    expect(entryDelta("withdrawal", 50)).toBe(-50);
    expect(entryDelta("expense", 25)).toBe(-25);
    expect(entryDelta("transfer", 10)).toBe(-10);
  });

  it("coerces decimal strings coming from the database", () => {
    expect(entryDelta("contribution", "150.50")).toBe(150.5);
  });
});

describe("computeSharedBalance", () => {
  it("sums contributions minus outgoing movements and rounds to 2 decimals", () => {
    const balance = computeSharedBalance([
      entry({ type: "contribution", amount: 1000 }),
      entry({ type: "expense", amount: 333.33 }),
      entry({ type: "withdrawal", amount: 100 }),
    ]);
    expect(balance).toBe(566.67);
  });

  it("ignores voided entries", () => {
    const balance = computeSharedBalance([
      entry({ type: "contribution", amount: 500 }),
      entry({ type: "expense", amount: 500, voided_at: new Date() }),
    ]);
    expect(balance).toBe(500);
  });
});
