import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('budgets')
export class Budget {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'date' })
  month!: Date;

  @Column({ type: 'varchar', length: 10 })
  budget_type!: string;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  percentage!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  target_amount!: number;

  @Column({ nullable: true })
  notes!: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}