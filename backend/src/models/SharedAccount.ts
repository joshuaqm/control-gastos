import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User';

/** A pool/account shared between friends. Its balance derives from SharedEntry rows. */
@Entity('shared_accounts')
export class SharedAccount {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 20, default: 'pool' })
  kind!: 'pool' | 'savings' | 'goal';

  @Column({ type: 'varchar', length: 10, default: 'MXN' })
  currency!: string;

  @Column({ name: 'owner_id' })
  owner_id!: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'owner_id' })
  owner!: User;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: 'active' | 'archived';

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
