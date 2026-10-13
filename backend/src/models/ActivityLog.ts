import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

export type ActivityScope = 'friendship' | 'shared_account' | 'peer_loan' | 'shared_goal';

/** Immutable audit trail for shared-finance operations. */
@Entity('activity_logs')
@Index(['scope', 'scope_id'])
export class ActivityLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 30 })
  scope!: ActivityScope;

  @Column({ name: 'scope_id' })
  scope_id!: number;

  @Column({ name: 'actor_id' })
  actor_id!: number;

  @Column({ length: 50 })
  action!: string;

  @Column({ type: 'jsonb', nullable: true })
  payload!: Record<string, unknown> | null;

  @CreateDateColumn()
  created_at!: Date;
}
