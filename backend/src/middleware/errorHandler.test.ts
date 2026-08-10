import { describe, it, expect, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";
import { AppError, errorHandler } from "./errorHandler";

function mockRes() {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

const req = {} as Request;
const next = (() => undefined) as NextFunction;

// Silence logger output during tests
vi.mock("../utils/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

describe("AppError", () => {
  it("creates an operational error with the given status", () => {
    const err = new AppError("Not found", 404);
    expect(err.message).toBe("Not found");
    expect(err.statusCode).toBe(404);
    expect(err.isOperational).toBe(true);
    expect(err).toBeInstanceOf(Error);
  });
});

describe("errorHandler", () => {
  it("responds with the AppError status and message", () => {
    const res = mockRes();
    errorHandler(new AppError("Ese correo ya está registrado", 409), req, res, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: "Ese correo ya está registrado",
      status: "error",
    });
  });

  it("responds 401 for authentication errors", () => {
    const res = mockRes();
    errorHandler(new AppError("Authentication required", 401), req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: "Authentication required",
      status: "error",
    });
  });

  it("responds 500 with a generic message for unknown errors", () => {
    const res = mockRes();
    errorHandler(new Error("boom"), req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Internal server error",
      status: "error",
    });
  });
});
