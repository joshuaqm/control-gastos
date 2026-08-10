import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { settingsRouter } from "./settings";
import { User } from "../models/User";
import { buildApp, mockGetRepository } from "../test/helpers";

vi.mock("../config/database", () => ({
  AppDataSource: { getRepository: vi.fn() },
}));

vi.mock("../utils/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { AppDataSource } from "../config/database";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_key";
const getRepository = vi.mocked(AppDataSource.getRepository);

function makeToken(id = 1) {
  return jwt.sign({ id, username: "testuser", email: "test@finance.com" }, JWT_SECRET, {
    expiresIn: "1h",
  });
}

const baseUser = () => ({
  id: 1,
  username: "testuser",
  email: "test@finance.com",
  currency: "MXN",
  notifications_enabled: true,
  monthly_income: 15000,
  is_active: true,
});

describe("GET /api/v1/settings", () => {
  beforeEach(() => {
    const userRepo = {
      findOne: vi.fn(),
    };
    getRepository.mockImplementation((entity) =>
      entity === User ? (userRepo as never) : (null as never),
    );
  });

  it("returns 401 without a token", async () => {
    const app = buildApp(settingsRouter);
    const res = await request(app).get("/");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Authentication required");
  });

  it("returns the user settings for a valid token", async () => {
    const userRepo = {
      findOne: vi.fn().mockResolvedValue(baseUser()),
    };
    getRepository.mockReturnValue(userRepo as never);

    const app = buildApp(settingsRouter);
    const res = await request(app).get("/").set("Authorization", `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      username: "testuser",
      email: "test@finance.com",
      currency: "MXN",
      notifications_enabled: true,
      monthly_income: 15000,
    });
    expect(userRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it("returns 404 when the user does not exist", async () => {
    const userRepo = { findOne: vi.fn().mockResolvedValue(null) };
    getRepository.mockReturnValue(userRepo as never);

    const app = buildApp(settingsRouter);
    const res = await request(app).get("/").set("Authorization", `Bearer ${makeToken()}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("User not found");
  });
});

describe("PUT /api/v1/settings", () => {
  it("updates currency and notifications", async () => {
    const user = { ...baseUser(), save: vi.fn().mockResolvedValue(undefined) };
    const userRepo = {
      findOne: vi.fn().mockResolvedValue(user),
      save: vi.fn().mockResolvedValue(user),
    };
    getRepository.mockReturnValue(userRepo as never);

    const app = buildApp(settingsRouter);
    const res = await request(app)
      .put("/")
      .set("Authorization", `Bearer ${makeToken()}`)
      .send({ currency: "USD", notifications_enabled: false });

    expect(res.status).toBe(200);
    expect(res.body.currency).toBe("USD");
    expect(res.body.notifications_enabled).toBe(false);
    expect(user.currency).toBe("USD");
  });

  it("rejects an email in use by another user with 409", async () => {
    const user = { ...baseUser(), save: vi.fn() };
    const other = { id: 2, email: "taken@finance.com" };
    const userRepo = {
      findOne: vi.fn().mockImplementation(({ where }: { where: { email?: string } }) => {
        if (where.email === "taken@finance.com") return Promise.resolve(other);
        return Promise.resolve(user);
      }),
      save: vi.fn().mockResolvedValue(user),
    };
    getRepository.mockReturnValue(userRepo as never);

    const app = buildApp(settingsRouter);
    const res = await request(app)
      .put("/")
      .set("Authorization", `Bearer ${makeToken()}`)
      .send({ email: "taken@finance.com" });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("Ese correo ya está registrado");
  });

  it("rejects a negative monthly income with 400", async () => {
    const user = { ...baseUser(), save: vi.fn() };
    const userRepo = {
      findOne: vi.fn().mockResolvedValue(user),
      save: vi.fn().mockResolvedValue(user),
    };
    getRepository.mockReturnValue(userRepo as never);

    const app = buildApp(settingsRouter);
    const res = await request(app)
      .put("/")
      .set("Authorization", `Bearer ${makeToken()}`)
      .send({ monthly_income: -5 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Ingreso mensual inválido");
  });
});

describe("PUT /api/v1/settings/password", () => {
  it("rejects when the current password is wrong", async () => {
    const userRepo = {
      findOne: vi.fn().mockResolvedValue({
        ...baseUser(),
        password_hash: "$2a$12$invalidbutusedfortest",
      }),
    };
    getRepository.mockReturnValue(userRepo as never);

    const app = buildApp(settingsRouter);
    const res = await request(app)
      .put("/password")
      .set("Authorization", `Bearer ${makeToken()}`)
      .send({ currentPassword: "WrongPass123!", newPassword: "NewPass123!" });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("La contraseña actual es incorrecta");
  });

  it("rejects a new password shorter than 6 characters", async () => {
    const userRepo = { findOne: vi.fn().mockResolvedValue(baseUser()) };
    getRepository.mockReturnValue(userRepo as never);

    const app = buildApp(settingsRouter);
    const res = await request(app)
      .put("/password")
      .set("Authorization", `Bearer ${makeToken()}`)
      .send({ currentPassword: "whatever", newPassword: "123" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("La nueva contraseña debe tener al menos 6 caracteres");
  });
});

describe("Auth roundtrip", () => {
  it("accepts a token signed with the same payload shape the login issues", () => {
    const token = makeToken(3);
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number };
    expect(decoded.id).toBe(3);
  });
});
