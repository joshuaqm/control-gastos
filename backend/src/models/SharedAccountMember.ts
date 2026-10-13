import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

export type SharedRole = 'owner' | 'admin' | 'member' | 'viewer';

/** Membership + role of a user inside a shared account. */
@Entity('shared_account_members')
@Index(['shared_account_id', 'user_id'], { unique: true })
export class SharedAccountMember {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'shared_account_id' })
  shared_account_id!: number;

  @Column({ name: 'user_id' })
  user_id!: number;

  @Column({ type: 'varchar', length: 20, default: 'member' })
  role!: SharedRole;

  @CreateDateColumn()
  joined_at!: Date;

  @Column({ type: 'timestamp', nullable: true })
  left_at!: Date | null;
}
