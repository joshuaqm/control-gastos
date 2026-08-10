import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import * as bcrypt from "bcryptjs";
import { authRouter } from "./auth";
import { User } from "../models/User";
import { Budget } from "../models/Budget";
import { buildApp, mockGetRepository } from "../test/helpers";

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
    create: vi.fn((obj: Partial<User>) => ({ ...obj }) as User),
    save: vi.fn(async (obj: Partial<User>) => obj as User),
  };
  const budgetRepo = {
    create: vi.fn((obj) => obj),
    save: vi.fn(async (obj) => obj),
  };
  getRepository.mockImplementation((entity) =>
    entity === User
      ? (userRepo as never)
      : entity === Budget
        ? (budgetRepo as never)
        : (null as never),
  );
  return { userRepo, budgetRepo };
}

beforeEach(() => {
  getRepository.mockReset();
});

describe("POST /api/v1/auth/register", () => {
  it("returns 400 when required fields are missing", async () => {
    setupRepos({ existingUser: null });
    const app = buildApp(authRouter);

    const res = await request(app).post("/register").send({ email: "a@b.com" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Username, email and password are required");
  });

  it("returns 400 for a short password", async () => {
    setupRepos({ existingUser: null });
    const app = buildApp(authRouter);

    const res = await request(app)
      .post("/register")
      .send({ username: "x", email: "x@x.com", password: "123" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Password must be at least 6 characters");
  });

  it("returns 409 when the username or email already exists", async () => {
    setupRepos({ existingUser: { id: 1, email: "existing@x.com" } });
    const app = buildApp(authRouter);

    const res = await request(app)
      .post("/register")
      .send({ username: "dup", email: "existing@x.com", password: "123456" });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe("Username or email already exists");
  });

  it("registers a new user, hashes the password and returns a token", async () => {
    const { userRepo, budgetRepo } = setupRepos({ existingUser: null });
    const app = buildApp(authRouter);

    const res = await request(app)
      .post("/register")
      .send({ username: "nuevo", email: "nuevo@x.com", password: "secret123" });

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ username: "nuevo", email: "nuevo@x.com" });
    expect(typeof res.body.token).toBe("string");
    expect(res.body.user).not.toHaveProperty("password_hash");

    const saved = userRepo.save.mock.calls[0]?.[0] as Partial<User>;
    expect(saved.password_hash).toBeDefined();
    expect(saved.password_hash).not.toBe("secret123");
    expect(bcrypt.compareSync("secret123", saved.password_hash as string)).toBe(true);

    // Default 50/30/20 budgets created for the new user
    expect(budgetRepo.save).toHaveBeenCalledTimes(3);
  });
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
