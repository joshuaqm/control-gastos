import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * A shared goal. It belongs to a shared account so access can reuse the
 * membership/roles of that account.
 */
@Entity('shared_goals')
export class SharedGoal {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'shared_account_id' })
  shared_account_id!: number;

  @Column({ name: 'created_by' })
  created_by!: number;

  @Column({ length: 100 })
  name!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  target_amount!: number;

  @Column({ type: 'date', nullable: true })
  target_date!: Date | null;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: 'active' | 'completed' | 'archived';

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
