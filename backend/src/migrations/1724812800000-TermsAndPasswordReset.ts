import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class TermsAndPasswordReset1724812800000 implements MigrationInterface {
  name = 'TermsAndPasswordReset1724812800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. Nuevas columnas en `users` ──────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS accepted_terms  BOOLEAN      NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS terms_version   VARCHAR(20)  NULL,
        ADD COLUMN IF NOT EXISTS accepted_at     TIMESTAMP    NULL,
        ADD COLUMN IF NOT EXISTS ai_consent      BOOLEAN      NOT NULL DEFAULT true
    `);

    // ── 2. Tabla `password_reset_tokens` ───────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id          SERIAL       PRIMARY KEY,
        user_id     INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token       VARCHAR(255) NOT NULL UNIQUE,
        expires_at  TIMESTAMP    NOT NULL,
        used        BOOLEAN      NOT NULL DEFAULT false,
        created_at  TIMESTAMP    NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_prt_user_id ON password_reset_tokens (user_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_prt_token   ON password_reset_tokens (token)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_prt_expires ON password_reset_tokens (expires_at)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ── Revertir ───────────────────────────────────────────────────────────
    await queryRunner.query(`DROP TABLE IF EXISTS password_reset_tokens`);

    await queryRunner.query(`
      ALTER TABLE users
        DROP COLUMN IF EXISTS accepted_terms,
        DROP COLUMN IF EXISTS terms_version,
        DROP COLUMN IF EXISTS accepted_at,
        DROP COLUMN IF EXISTS ai_consent
    `);
  }
}
