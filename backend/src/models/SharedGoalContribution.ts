import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/** A contribution toward a shared goal. Voided instead of deleted. */
@Entity('shared_goal_contributions')
export class SharedGoalContribution {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'shared_goal_id' })
  shared_goal_id!: number;

  @Column({ name: 'user_id' })
  user_id!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: number;

  @Column({ type: 'date' })
  date!: Date;

  @Column({ length: 200, nullable: true })
  note!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  voided_at!: Date | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
