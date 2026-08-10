import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User';
import { Account } from './Account';

@Entity('credit_installments')
export class CreditInstallment {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id' })
  userId!: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'int', nullable: true })
  account_id!: number | null;

  @ManyToOne(() => Account)
  @JoinColumn({ name: 'account_id' })
  account!: Account;

  @Column({ type: 'date', nullable: true })
  start_date!: Date | null;

  @Column({ length: 200 })
  description!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  monthly_amount!: number;

  @Column({ type: 'int' })
  months_total!: number;

  @Column({ type: 'int', default: 0 })
  months_paid!: number;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: string;

  @Column({ nullable: true })
  notes!: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}