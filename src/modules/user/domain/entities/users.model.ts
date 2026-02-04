import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * User Entity: Lớp Domain.
 * Định nghĩa cấu trúc dữ liệu cốt lõi và các quy tắc nghiệp vụ của User.
 */
export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export enum GenderPreference {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  BOTH = 'BOTH',
}

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({ nullable: true })
  fullName: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false }) // Hide password by default
  password: string;

  @Column({ nullable: true })
  phoneNumber: string;

  @Column({ nullable: true, type: 'date' })
  birthDate: Date;

  @Column({
    type: 'enum',
    enum: Gender,
    nullable: true,
  })
  gender: Gender;

  @Column({
    type: 'enum',
    enum: GenderPreference,
    default: GenderPreference.BOTH,
  })
  genderPreference: GenderPreference;

  @Column({ type: 'text', nullable: true })
  bio: string;

  // Store photos as JSON array of URLs
  @Column({ type: 'simple-json', nullable: true })
  photos: string[];

  @Column({ nullable: true })
  avatar: string; // Main profile picture

  @Column({ nullable: true })
  jobTitle: string;

  @Column({ nullable: true })
  company: string;

  @Column({ nullable: true })
  school: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude: number;

  @Column({ type: 'simple-array', nullable: true })
  interests: string[];

  @Column({ default: false })
  isVerified: boolean;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isPremium: boolean;

  @Column({ nullable: true, type: 'timestamp' })
  lastActiveAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
