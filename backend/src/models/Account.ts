import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { Transaction } from './Transaction';
import { User } from './User';
import { AccountType } from '../types';

@Entity('accounts')
export class Account {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id' })
  userId!: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 20 })
  type!: AccountType;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  initial_balance!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  credit_limit!: number | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  interest_rate!: number | null;

  @Column({ type: 'int', nullable: true })
  cutoff_day!: number | null;

  @Column({ type: 'int', nullable: true })
  payment_due_day!: number | null;

  @Column({ default: true })
  is_active!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @OneToMany(() => Transaction, transaction => transaction.account)
  transactions!: Transaction[];
}