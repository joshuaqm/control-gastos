import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Account } from './Account';
import { TransactionType, BudgetType } from '../types';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'date' })
  date!: Date;

  @Column({ length: 200 })
  description!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: number;

  @Column({ type: 'varchar', length: 20 })
  type!: TransactionType;

  @Column({ type: 'varchar', length: 50, nullable: true })
  category!: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  budget_type!: BudgetType | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  notes!: string | null;

  @ManyToOne(() => Account, account => account.transactions)
  @JoinColumn({ name: 'account_id' })
  account!: Account;

  @Column({ type: 'int', nullable: true })
  account_id!: number | null;

  @Column({ type: 'int', nullable: true })
  destination_account_id!: number | null;

  @Column({ type: 'int', nullable: true })
  debt_id!: number | null;

  @Column({ type: 'int', nullable: true })
  receivable_id!: number | null;

  @Column({ type: 'int', nullable: true })
  recurring_id!: number | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}