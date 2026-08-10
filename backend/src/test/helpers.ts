import express from "express";
import { vi } from "vitest";
import { errorHandler } from "../middleware/errorHandler";

/** Builds an Express app around a router with the real error handler attached. */
export function buildApp(...routers: express.Router[]): express.Express {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  for (const router of routers) {
    app.use(router);
  }
  app.use(errorHandler);
  return app;
}

export interface MockRepo<T> {
  find?: ReturnType<typeof vi.fn>;
  findOne?: ReturnType<typeof vi.fn>;
  create?: ReturnType<typeof vi.fn>;
  save?: ReturnType<typeof vi.fn>;
  remove?: ReturnType<typeof vi.fn>;
  [key: string]: unknown;
}

type EntityClass = { name: string };

/**
 * A lightweight in-memory repository keyed by entity class, compatible with
 * how the routes call AppDataSource.getRepository(...).
 */
export function mockGetRepository(registry: Map<EntityClass, unknown>) {
  return vi.fn((entity: EntityClass) => {
    const repo = registry.get(entity);
    if (!repo) {
      throw new Error(`No mock repository registered for ${entity.name}`);
    }
    return repo;
  });
}
