import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('debts')
export class Debt {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 100 })
  name!: string;

  @Column({ length: 100 })
  creditor!: string;

  @Column({ type: 'varchar', length: 20 })
  type!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  original_amount!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  interest_rate!: number;

  @Column({ type: 'date' })
  start_date!: Date;

  @Column({ type: 'date', nullable: true })
  due_date!: Date;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: string;

  @Column({ nullable: true })
  notes!: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}