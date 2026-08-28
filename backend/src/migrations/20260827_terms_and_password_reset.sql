-- ============================================================================
-- Migración: Términos & Condiciones + Recuperación de Contraseña
-- Fecha: 2026-08-27
-- Descripción:
--   1. Agrega columnas de aceptación de términos y consentimiento a la tabla
--      `users` (accepted_terms, terms_version, accepted_at, ai_consent).
--   2. Crea la tabla `password_reset_tokens` para el flujo de recuperación de
--      contraseña vía email.
-- ============================================================================

BEGIN;

-- ── 1. Nuevas columnas en `users` ────────────────────────────────────────────

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS accepted_terms  BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS terms_version   VARCHAR(20)  NULL,
  ADD COLUMN IF NOT EXISTS accepted_at     TIMESTAMP    NULL,
  ADD COLUMN IF NOT EXISTS ai_consent      BOOLEAN      NOT NULL DEFAULT true;

-- ── 2. Tabla `password_reset_tokens` ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          SERIAL       PRIMARY KEY,
  user_id     INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       VARCHAR(255) NOT NULL UNIQUE,
  expires_at  TIMESTAMP    NOT NULL,
  used        BOOLEAN      NOT NULL DEFAULT false,
  created_at  TIMESTAMP    NOT NULL DEFAULT now()
);

-- Índices para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_prt_user_id   ON password_reset_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_prt_token     ON password_reset_tokens (token);
CREATE INDEX IF NOT EXISTS idx_prt_expires   ON password_reset_tokens (expires_at);

COMMIT;
