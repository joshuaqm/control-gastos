import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { friendsRouter } from "./friends";
import { User } from "../models/User";
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

describe("friend invitations", () => {
  it("rejects inviting yourself (400)", async () => {
    const userRepo = { findOne: vi.fn().mockResolvedValue({ id: 1, username: "me", is_active: true }) };
    getRepository.mockImplementation((entity) => (entity === User ? (userRepo as never) : ({} as never)));

    const app = buildApp(friendsRouter);
    const res = await request(app)
      .post("/invitations")
      .set("Authorization", `Bearer ${makeToken(1)}`)
      .send({ user_id: 1 });

    expect(res.status).toBe(400);
  });

  it("returns 404 when the target user does not exist", async () => {
    const userRepo = { findOne: vi.fn().mockResolvedValue(null) };
    getRepository.mockImplementation((entity) => (entity === User ? (userRepo as never) : ({} as never)));

    const app = buildApp(friendsRouter);
    const res = await request(app)
      .post("/invitations")
      .set("Authorization", `Bearer ${makeToken(1)}`)
      .send({ username: "ghost" });

    expect(res.status).toBe(404);
  });

  it("creates a pending invitation for an existing user (201)", async () => {
    const userRepo = { findOne: vi.fn().mockResolvedValue({ id: 2, username: "bob", is_active: true }) };
    const friendshipRepo = {
      find: vi.fn().mockResolvedValue([]),
      create: vi.fn((data) => data),
      save: vi.fn().mockImplementation(async (data) => ({ ...data, id: 7 })),
    };
    getRepository.mockImplementation((entity) => {
      if (entity === User) return userRepo as never;
      if (entity === Friendship) return friendshipRepo as never;
      return {} as never;
    });

    const app = buildApp(friendsRouter);
    const res = await request(app)
      .post("/invitations")
      .set("Authorization", `Bearer ${makeToken(1)}`)
      .send({ user_id: 2 });

    expect(res.status).toBe(201);
    expect(res.body.friendship_id).toBe(7);
    expect(friendshipRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ requester_id: 1, addressee_id: 2, status: "pending" }),
    );
  });

  it("only the addressee can accept an invitation (403 for requester)", async () => {
    const friendshipRepo = {
      findOne: vi.fn().mockResolvedValue({
        id: 5,
        requester_id: 1,
        addressee_id: 2,
        status: "pending",
      }),
      save: vi.fn(),
    };
    getRepository.mockImplementation((entity) =>
      entity === Friendship ? (friendshipRepo as never) : ({} as never),
    );

    const app = buildApp(friendsRouter);
    const res = await request(app)
      .put("/5/accept")
      .set("Authorization", `Bearer ${makeToken(1)}`);

    expect(res.status).toBe(403);
    expect(friendshipRepo.save).not.toHaveBeenCalled();
  });
});
