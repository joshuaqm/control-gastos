import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * FEAT-02 tables (friends & shared finances). Purely additive: it only creates
 * new tables/indexes, so no existing data is touched. Production runs with
 * `synchronize: false`, so this migration is required for the feature to work.
 */
export class SharedFinance1730500000000 implements MigrationInterface {
  name = 'SharedFinance1730500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── friendships ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS friendships (
        id            SERIAL      PRIMARY KEY,
        requester_id  INTEGER     NOT NULL,
        addressee_id  INTEGER     NOT NULL,
        status        VARCHAR(20) NOT NULL DEFAULT 'pending',
        responded_at  TIMESTAMP   NULL,
        created_at    TIMESTAMP   NOT NULL DEFAULT now(),
        updated_at    TIMESTAMP   NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_friendships_pair ON friendships (requester_id, addressee_id)`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships (addressee_id)`
    );

    // ── shared_accounts ────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS shared_accounts (
        id          SERIAL       PRIMARY KEY,
        name        VARCHAR(100) NOT NULL,
        kind        VARCHAR(20)  NOT NULL DEFAULT 'pool',
        currency    VARCHAR(10)  NOT NULL DEFAULT 'MXN',
        owner_id    INTEGER      NOT NULL REFERENCES users(id),
        status      VARCHAR(20)  NOT NULL DEFAULT 'active',
        created_at  TIMESTAMP    NOT NULL DEFAULT now(),
        updated_at  TIMESTAMP    NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_shared_accounts_owner ON shared_accounts (owner_id)`
    );

    // ── shared_account_members ─────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS shared_account_members (
        id                 SERIAL      PRIMARY KEY,
        shared_account_id  INTEGER     NOT NULL,
        user_id            INTEGER     NOT NULL,
        role               VARCHAR(20) NOT NULL DEFAULT 'member',
        joined_at          TIMESTAMP   NOT NULL DEFAULT now(),
        left_at            TIMESTAMP   NULL
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_shared_account_members ON shared_account_members (shared_account_id, user_id)`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_shared_account_members_user ON shared_account_members (user_id)`
    );

    // ── shared_entries ─────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS shared_entries (
        id                 SERIAL        PRIMARY KEY,
        shared_account_id  INTEGER       NOT NULL,
        user_id            INTEGER       NOT NULL,
        type               VARCHAR(20)   NOT NULL,
        amount             DECIMAL(12,2) NOT NULL,
        date               DATE          NOT NULL,
        description        VARCHAR(200)  NULL,
        category           VARCHAR(100)  NULL,
        voided_at          TIMESTAMP     NULL,
        created_at         TIMESTAMP     NOT NULL DEFAULT now(),
        updated_at         TIMESTAMP     NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_shared_entries_account ON shared_entries (shared_account_id)`
    );

    // ── peer_loans ─────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS peer_loans (
        id               SERIAL        PRIMARY KEY,
        lender_id        INTEGER       NOT NULL,
        borrower_id      INTEGER       NOT NULL,
        original_amount  DECIMAL(12,2) NOT NULL,
        currency         VARCHAR(10)   NOT NULL DEFAULT 'MXN',
        description      VARCHAR(200)  NULL,
        start_date       DATE          NOT NULL,
        due_date         DATE          NULL,
        status           VARCHAR(20)   NOT NULL DEFAULT 'open',
        created_at       TIMESTAMP     NOT NULL DEFAULT now(),
        updated_at       TIMESTAMP     NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_peer_loans_lender ON peer_loans (lender_id)`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_peer_loans_borrower ON peer_loans (borrower_id)`
    );

    // ── peer_loan_payments ─────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS peer_loan_payments (
        id            SERIAL        PRIMARY KEY,
        peer_loan_id  INTEGER       NOT NULL,
        payer_id      INTEGER       NOT NULL,
        amount        DECIMAL(12,2) NOT NULL,
        date          DATE          NOT NULL,
        method        VARCHAR(50)   NULL,
        note          VARCHAR(200)  NULL,
        voided_at     TIMESTAMP     NULL,
        created_at    TIMESTAMP     NOT NULL DEFAULT now(),
        updated_at    TIMESTAMP     NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_peer_loan_payments_loan ON peer_loan_payments (peer_loan_id)`
    );

    // ── shared_goals ───────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS shared_goals (
        id                 SERIAL        PRIMARY KEY,
        shared_account_id  INTEGER       NOT NULL,
        created_by         INTEGER       NOT NULL,
        name               VARCHAR(100)  NOT NULL,
        target_amount      DECIMAL(12,2) NOT NULL,
        target_date        DATE          NULL,
        status             VARCHAR(20)   NOT NULL DEFAULT 'active',
        created_at         TIMESTAMP     NOT NULL DEFAULT now(),
        updated_at         TIMESTAMP     NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_shared_goals_account ON shared_goals (shared_account_id)`
    );

    // ── shared_goal_contributions ──────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS shared_goal_contributions (
        id              SERIAL        PRIMARY KEY,
        shared_goal_id  INTEGER       NOT NULL,
        user_id         INTEGER       NOT NULL,
        amount          DECIMAL(12,2) NOT NULL,
        date            DATE          NOT NULL,
        note            VARCHAR(200)  NULL,
        voided_at       TIMESTAMP     NULL,
        created_at      TIMESTAMP     NOT NULL DEFAULT now(),
        updated_at      TIMESTAMP     NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_shared_goal_contrib_goal ON shared_goal_contributions (shared_goal_id)`
    );

    // ── activity_logs ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id          SERIAL      PRIMARY KEY,
        scope       VARCHAR(30) NOT NULL,
        scope_id    INTEGER     NOT NULL,
        actor_id    INTEGER     NOT NULL,
        action      VARCHAR(50) NOT NULL,
        payload     JSONB       NULL,
        created_at  TIMESTAMP   NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_activity_logs_scope ON activity_logs (scope, scope_id)`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop in reverse dependency order. Only objects created by `up`.
    await queryRunner.query(`DROP TABLE IF EXISTS activity_logs`);
    await queryRunner.query(`DROP TABLE IF EXISTS shared_goal_contributions`);
    await queryRunner.query(`DROP TABLE IF EXISTS shared_goals`);
    await queryRunner.query(`DROP TABLE IF EXISTS peer_loan_payments`);
    await queryRunner.query(`DROP TABLE IF EXISTS peer_loans`);
    await queryRunner.query(`DROP TABLE IF EXISTS shared_entries`);
    await queryRunner.query(`DROP TABLE IF EXISTS shared_account_members`);
    await queryRunner.query(`DROP TABLE IF EXISTS shared_accounts`);
    await queryRunner.query(`DROP TABLE IF EXISTS friendships`);
  }
}
