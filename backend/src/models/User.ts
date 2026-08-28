import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 100, unique: true })
  username!: string;

  @Column({ length: 255, unique: true })
  email!: string;

  @Column({ length: 255 })
  password_hash!: string;

  @Column({ default: true })
  is_active!: boolean;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  monthly_income!: number | null;

  @Column({ type: 'varchar', length: 10, default: 'MXN' })
  currency!: string;

  @Column({ name: 'notifications_enabled', default: true })
  notifications_enabled!: boolean;

  @Column({ name: 'accepted_terms', default: false })
  accepted_terms!: boolean;

  @Column({ name: 'terms_version', type: 'varchar', length: 20, nullable: true })
  terms_version!: string | null;

  @Column({ name: 'accepted_at', type: 'timestamp', nullable: true })
  accepted_at!: Date | null;

  @Column({ name: 'ai_consent', default: true })
  ai_consent!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}