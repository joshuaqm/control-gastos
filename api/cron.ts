import "reflect-metadata";
import type { Request, Response } from "express";
import { ensureDb } from "../backend/src/config/database";

export default async function handler(_req: Request, res: Response): Promise<void> {
  try {
    const dataSource = await ensureDb();
    const result = await dataSource.query(
      "SELECT count(*)::int AS users, (SELECT count(*)::int FROM transactions) AS transactions"
    );
    const row = result[0] || {};
    res.status(200).json({
      ok: true,
      timestamp: new Date().toISOString(),
      users: row.users || 0,
      transactions: row.transactions || 0,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
