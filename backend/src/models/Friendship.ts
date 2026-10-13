import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * A friendship between two users. A single row represents the relationship;
 * `requester_id`/`addressee_id` keep the direction of the invitation.
 */
@Entity('friendships')
@Index(['requester_id', 'addressee_id'], { unique: true })
export class Friendship {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'requester_id' })
  requester_id!: number;

  @Column({ name: 'addressee_id' })
  addressee_id!: number;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status!: 'pending' | 'accepted' | 'rejected' | 'blocked';

  @Column({ type: 'timestamp', nullable: true })
  responded_at!: Date | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
