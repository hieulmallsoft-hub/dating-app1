import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('admins')
export class Admin {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  fullName?: string;

  @Index()
  @Column({ type: 'varchar', length: 180, unique: true, nullable: true })
  email?: string;

  // Lưu hash (bcrypt), không select mặc định
  @Column({ name: 'password_hash', type: 'varchar', length: 255, select: false, nullable: true })
  passwordHash?: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phoneNumber?: string;

  @Column({
    name: 'refresh_token_hash',
    type: 'varchar',
    length: 255,
    nullable: true,
    select: false,
  })
  refreshTokenHash?: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
