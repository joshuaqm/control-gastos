import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type SharedEntryType = 'contribution' | 'withdrawal' | 'expense' | 'transfer';

/**
 * A movement inside a shared account. Rows are never hard-deleted: they are
 * voided (`voided_at`) so the history stays consistent.
 */
@Entity('shared_entries')
export class SharedEntry {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'shared_account_id' })
  shared_account_id!: number;

  @Column({ name: 'user_id' })
  user_id!: number;

  @Column({ type: 'varchar', length: 20 })
  type!: SharedEntryType;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: number;

  @Column({ type: 'date' })
  date!: Date;

  @Column({ length: 200, nullable: true })
  description!: string | null;

  @Column({ length: 100, nullable: true })
  category!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  voided_at!: Date | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
