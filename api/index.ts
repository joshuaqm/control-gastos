import "reflect-metadata";
import type { Request, Response } from "express";
import app from "../backend/src/app";

// Vercel functions run in UTC by default; align server-side calculations
// (month boundaries, reminders, cron) with Ciudad de México time.
process.env.TZ = process.env.TZ || "America/Mexico_City";

export default function handler(req: Request, res: Response): Promise<void> {
  const url = req.url || "/";
  if (url !== "/api" && !url.startsWith("/api/")) {
    req.url = "/api" + url;
  }
  return new Promise<void>((resolve) => {
    try {
      app(req, res);
    } catch (error) {
      if (!res.headersSent) {
        res.statusCode = 500;
      }
      res.end();
    }
    res.on("finish", () => resolve());
    res.on("close", () => resolve());
  });
}
