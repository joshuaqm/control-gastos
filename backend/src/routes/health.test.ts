import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { healthRouter } from "./health";
import { buildApp } from "../test/helpers";

vi.mock("../config/database", () => ({
  AppDataSource: { isInitialized: false },
}));

vi.mock("../utils/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { AppDataSource } from "../config/database";

beforeEach(() => {
  (AppDataSource as { isInitialized: boolean }).isInitialized = false;
});

describe("GET /api/v1/health", () => {
  it("reports healthy with the database state", async () => {
    const app = buildApp(healthRouter);
    const res = await request(app).get("/");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("healthy");
    expect(res.body.database).toBe("disconnected");
    expect(typeof res.body.timestamp).toBe("string");
  });

  it("reports the database connected when initialized", async () => {
    (AppDataSource as { isInitialized: boolean }).isInitialized = true;
    const app = buildApp(healthRouter);
    const res = await request(app).get("/");

    expect(res.status).toBe(200);
    expect(res.body.database).toBe("connected");
  });
});
