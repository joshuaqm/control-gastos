import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { sharedAccountsRouter } from "./sharedAccounts";
import { SharedAccountMember } from "../models/SharedAccountMember";
import { Friendship } from "../models/Friendship";
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

beforeEach(() => {
  getRepository.mockReset();
});

describe("shared account authorization", () => {
  it("blocks a non-member from posting an entry (403)", async () => {
    const memberRepo = { findOne: vi.fn().mockResolvedValue(null) };
    getRepository.mockImplementation((entity) =>
      entity === SharedAccountMember ? (memberRepo as never) : ({} as never),
    );

    const app = buildApp(sharedAccountsRouter);
    const res = await request(app)
      .post("/1/entries")
      .set("Authorization", `Bearer ${makeToken(1)}`)
      .send({ type: "contribution", amount: 100 });

    expect(res.status).toBe(403);
  });

  it("blocks a viewer from posting an entry (403)", async () => {
    const memberRepo = {
      findOne: vi.fn().mockResolvedValue({ role: "viewer", left_at: null, user_id: 1 }),
    };
    getRepository.mockImplementation((entity) =>
      entity === SharedAccountMember ? (memberRepo as never) : ({} as never),
    );

    const app = buildApp(sharedAccountsRouter);
    const res = await request(app)
      .post("/1/entries")
      .set("Authorization", `Bearer ${makeToken(1)}`)
      .send({ type: "contribution", amount: 100 });

    expect(res.status).toBe(403);
  });

  it("only lets management invite a friend as member (403 for plain member)", async () => {
    const memberRepo = {
      findOne: vi.fn().mockResolvedValue({ role: "member", left_at: null, user_id: 1 }),
    };
    getRepository.mockImplementation((entity) =>
      entity === SharedAccountMember ? (memberRepo as never) : ({} as never),
    );

    const app = buildApp(sharedAccountsRouter);
    const res = await request(app)
      .post("/1/members")
      .set("Authorization", `Bearer ${makeToken(1)}`)
      .send({ user_id: 2, role: "member" });

    expect(res.status).toBe(403);
  });

  it("refuses to add a non-friend as member (403)", async () => {
    const memberRepo = {
      findOne: vi.fn().mockResolvedValue({ role: "owner", left_at: null, user_id: 1 }),
    };
    const friendshipRepo = { find: vi.fn().mockResolvedValue([]) };
    getRepository.mockImplementation((entity) => {
      if (entity === SharedAccountMember) return memberRepo as never;
      if (entity === Friendship) return friendshipRepo as never;
      return {} as never;
    });

    const app = buildApp(sharedAccountsRouter);
    const res = await request(app)
      .post("/1/members")
      .set("Authorization", `Bearer ${makeToken(1)}`)
      .send({ user_id: 2, role: "member" });

    expect(res.status).toBe(403);
  });
});
