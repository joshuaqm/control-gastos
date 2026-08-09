import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('receivables')
export class Receivable {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 100 })
  person!: string;

  @Column({ length: 200, nullable: true })
  description!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  original_amount!: number;

  @Column({ type: 'date', nullable: true })
  due_date!: Date;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status!: string;

  @Column({ nullable: true })
  notes!: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}