import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/** A loan between two friends (lender → borrower). */
@Entity('peer_loans')
export class PeerLoan {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'lender_id' })
  lender_id!: number;

  @Column({ name: 'borrower_id' })
  borrower_id!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  original_amount!: number;

  @Column({ type: 'varchar', length: 10, default: 'MXN' })
  currency!: string;

  @Column({ length: 200, nullable: true })
  description!: string | null;

  @Column({ type: 'date' })
  start_date!: Date;

  @Column({ type: 'date', nullable: true })
  due_date!: Date | null;

  @Column({ type: 'varchar', length: 20, default: 'open' })
  status!: 'open' | 'settled' | 'cancelled';

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
