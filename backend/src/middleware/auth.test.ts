import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { authenticate } from "./auth";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_key";

function mockReq(partial: Partial<Request> = {}): Request {
  return {
    headers: {},
    body: {},
    params: {},
    query: {},
    ...partial,
  } as Request;
}

const mockRes = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn() }) as unknown as Response;

const nextMock = vi.fn() as ReturnType<typeof vi.fn> & NextFunction;

beforeEach(() => {
  nextMock.mockClear();
});

describe("authenticate middleware", () => {
  it("rejects requests without Authorization header", () => {
    authenticate(mockReq({ headers: {} }), mockRes(), nextMock);

    const err = nextMock.mock.calls[0]?.[0] as Error & { statusCode?: number };
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("Authentication required");
    expect((err as { statusCode: number }).statusCode).toBe(401);
  });

  it("rejects requests with a non-Bearer header", () => {
    const req = mockReq({ headers: { authorization: "Basic abc123" } });
    authenticate(req, mockRes(), nextMock);

    const err = nextMock.mock.calls[0]?.[0] as Error & { statusCode: number };
    expect(err.statusCode).toBe(401);
  });

  it("rejects an invalid/expired token", () => {
    const req = mockReq({
      headers: { authorization: "Bearer not-a-valid-token" },
    });
    authenticate(req, mockRes(), nextMock);

    const err = nextMock.mock.calls[0]?.[0] as Error & { statusCode: number };
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe("Invalid or expired token");
  });

  it("accepts a valid token and exposes the user on req", () => {
    const token = jwt.sign(
      { id: 42, username: "testuser", email: "test@finance.com" },
      JWT_SECRET,
      { expiresIn: "1h" },
    );
    const req = mockReq({
      headers: { authorization: `Bearer ${token}` },
    });

    authenticate(req, mockRes(), nextMock);

    expect(nextMock).toHaveBeenCalledWith();
    expect(nextMock).toHaveBeenCalledTimes(1);
    expect(req.user).toEqual({
      id: 42,
      username: "testuser",
      email: "test@finance.com",
    });
  });

  it("creates a token that the middleware accepts (roundtrip)", () => {
    const token = jwt.sign({ id: 7, username: "roundtrip", email: "round@trip.io" }, JWT_SECRET, {
      expiresIn: "7d",
    });
    const req = mockReq({
      headers: { authorization: `Bearer ${token}` },
    });

    authenticate(req, mockRes(), nextMock);
    expect(nextMock).toHaveBeenCalledWith();
    expect(req.user?.id).toBe(7);
  });
});
