import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User';

@Entity('investments')
export class Investment {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id' })
  userId!: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ length: 100 })
  name!: string;

  @Column({ length: 10, nullable: true })
  ticker!: string;

  @Column({ length: 50, nullable: true })
  broker!: string;

  @Column({ type: 'varchar', length: 20 })
  type!: string;

  @Column({ type: 'decimal', precision: 12, scale: 4 })
  units!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  average_cost!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  current_price!: number;

  @Column({ type: 'date', nullable: true })
  last_updated!: Date;

  @Column({ nullable: true })
  notes!: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}