import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('goals')
export class Goal {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 100 })
  name!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  target_amount!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  current_amount!: number;

  @Column({ type: 'date', nullable: true })
  target_date!: Date;

  @Column({ default: 1 })
  priority!: number;

  @Column({ nullable: true })
  notes!: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}