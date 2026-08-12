import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import * as bcrypt from "bcryptjs";
import { authRouter } from "./auth";
import { User } from "../models/User";
import { buildApp } from "../test/helpers";

vi.mock("../config/database", () => ({
  AppDataSource: { getRepository: vi.fn() },
}));

vi.mock("../utils/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { AppDataSource } from "../config/database";

const getRepository = vi.mocked(AppDataSource.getRepository);

function setupRepos(options: { existingUser?: Partial<User> | null }) {
  const { existingUser = null } = options;
  const userRepo = {
    findOne: vi.fn().mockResolvedValue(existingUser),
  };
  getRepository.mockImplementation((entity) => (entity === User ? (userRepo as never) : (null as never)));
  return { userRepo };
}

beforeEach(() => {
  getRepository.mockReset();
});

describe("POST /api/v1/auth/login", () => {
  it("returns 400 when fields are missing", async () => {
    setupRepos({ existingUser: null });
    const app = buildApp(authRouter);

    const res = await request(app).post("/login").send({ email: "a@b.com" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Email and password are required");
  });

  it("returns 401 for unknown email", async () => {
    setupRepos({ existingUser: null });
    const app = buildApp(authRouter);

    const res = await request(app)
      .post("/login")
      .send({ email: "ghost@x.com", password: "secret123" });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid credentials");
  });

  it("returns 401 for a wrong password", async () => {
    const hash = bcrypt.hashSync("correct-pass", 4);
    setupRepos({
      existingUser: {
        id: 1,
        username: "t",
        email: "t@x.com",
        password_hash: hash,
        is_active: true,
      },
    });
    const app = buildApp(authRouter);

    const res = await request(app)
      .post("/login")
      .send({ email: "t@x.com", password: "wrong-pass" });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid credentials");
  });

  it("returns 403 when the account is disabled", async () => {
    const hash = bcrypt.hashSync("secret123", 4);
    setupRepos({
      existingUser: {
        id: 1,
        username: "t",
        email: "t@x.com",
        password_hash: hash,
        is_active: false,
      },
    });
    const app = buildApp(authRouter);

    const res = await request(app).post("/login").send({ email: "t@x.com", password: "secret123" });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Account is disabled");
  });

  it("logs in successfully with valid credentials", async () => {
    const hash = bcrypt.hashSync("secret123", 4);
    setupRepos({
      existingUser: {
        id: 1,
        username: "testuser",
        email: "test@finance.com",
        password_hash: hash,
        is_active: true,
      },
    });
    const app = buildApp(authRouter);

    const res = await request(app)
      .post("/login")
      .send({ email: "test@finance.com", password: "secret123" });

    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe("testuser");
    expect(res.body.user).not.toHaveProperty("password_hash");
    expect(typeof res.body.token).toBe("string");
  });
});
