import { DataSource } from 'typeorm';
import { Account } from '../models/Account';
import { Transaction } from '../models/Transaction';
import { User } from '../models/User';
import { Debt } from '../models/Debt';
import { Receivable } from '../models/Receivable';
import { Budget } from '../models/Budget';
import { Goal } from '../models/Goal';
import { Investment } from '../models/Investment';
import { RecurringTransaction } from '../models/RecurringTransaction';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.POSTGRES_USER || 'finance_user',
  password: process.env.POSTGRES_PASSWORD || 'finance_password',
  database: process.env.POSTGRES_DB || 'finance_db',
  synchronize: process.env.NODE_ENV === 'development',
  logging: process.env.NODE_ENV === 'development',
  entities: [
    Account,
    Transaction,
    User,
    Debt,
    Receivable,
    Budget,
    Goal,
    Investment,
    RecurringTransaction
  ],
  migrations: ['src/migrations/*.ts'],
  subscribers: ['src/subscribers/*.ts'],
});