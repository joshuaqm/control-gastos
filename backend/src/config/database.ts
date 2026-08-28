import { DataSource } from 'typeorm';
import { Account } from '../models/Account';
import { Transaction } from '../models/Transaction';
import { User } from '../models/User';
import { Debt } from '../models/Debt';
import { Receivable } from '../models/Receivable';
import { CreditInstallment } from '../models/CreditInstallment';
import { Budget } from '../models/Budget';
import { Goal } from '../models/Goal';
import { Investment } from '../models/Investment';
import { RecurringTransaction } from '../models/RecurringTransaction';
import { PasswordResetToken } from '../models/PasswordResetToken';

const entities = [
  Account,
  Transaction,
  User,
  Debt,
  Receivable,
  CreditInstallment,
  Budget,
  Goal,
  Investment,
  RecurringTransaction,
  PasswordResetToken,
];

const databaseUrl = process.env.DATABASE_URL;
const isSupabase = databaseUrl?.includes('supabase.co') ?? false;
const sslEnabled =
  process.env.DATABASE_SSL === 'true' ||
  (isSupabase && process.env.DATABASE_SSL !== 'false');

export const AppDataSource = new DataSource(
  databaseUrl
    ? {
        type: 'postgres',
        url: databaseUrl,
        ssl: sslEnabled ? { rejectUnauthorized: false } : false,
        synchronize: process.env.NODE_ENV === 'development',
        logging:
          process.env.NODE_ENV === 'development' ||
          process.env.TYPEORM_LOGGING === 'true',
        entities,
      }
    : {
        type: 'postgres',
        host: process.env.DB_HOST || 'postgres',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.POSTGRES_USER || 'finance_user',
        password: process.env.POSTGRES_PASSWORD || 'finance_password',
        database: process.env.POSTGRES_DB || 'finance_db',
        synchronize: process.env.NODE_ENV === 'development',
        logging: process.env.NODE_ENV === 'development',
        entities,
        migrations: ['src/migrations/*.ts'],
        subscribers: ['src/subscribers/*.ts'],
      },
);

let initPromise: Promise<DataSource> | null = null;

export function ensureDb(): Promise<DataSource> {
  if (AppDataSource.isInitialized) {
    return Promise.resolve(AppDataSource);
  }
  if (!initPromise) {
    initPromise = AppDataSource.initialize().catch((error) => {
      initPromise = null;
      throw error;
    });
  }
  return initPromise;
}
