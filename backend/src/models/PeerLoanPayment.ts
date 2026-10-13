import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/** A (partial) payment toward a peer loan. Voided instead of deleted. */
@Entity('peer_loan_payments')
export class PeerLoanPayment {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'peer_loan_id' })
  peer_loan_id!: number;

  @Column({ name: 'payer_id' })
  payer_id!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: number;

  @Column({ type: 'date' })
  date!: Date;

  @Column({ length: 50, nullable: true })
  method!: string | null;

  @Column({ length: 200, nullable: true })
  note!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  voided_at!: Date | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
