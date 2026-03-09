import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from "typeorm";

export enum Gender { MALE="MALE", FEMALE="FEMALE", OTHER="OTHER" }
export enum GenderPreference { MALE="MALE", FEMALE="FEMALE", BOTH="BOTH" }
export enum AuthProvider { LOCAL="LOCAL", GOOGLE="GOOGLE", APPLE="APPLE" }
export enum UserRole { USER="USER", ADMIN="ADMIN" }

@Entity("users")
@Index(["provider", "socialId"], { unique: true })
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "enum", enum: AuthProvider, default: AuthProvider.LOCAL })
  provider: AuthProvider;

  @Column({ type: "enum", enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Column({ nullable: true })
  socialId: string | null;

  @Index()
  @Column({ unique: true })
  email: string;

  @Column({ unique: true, length: 10, nullable: true })
  accountCode: string | null;

  @Column({ select: false, nullable: true })
  password: string | null;

  @Column({ nullable: true })
  fullName: string | null;

  @Column({ nullable: true })
  phoneNumber: string | null;

  @Column({ nullable: true, type: "date" })
  birthDate: Date | null;

  @Column({ type: "enum", enum: Gender, nullable: true })
  gender: Gender | null;

  @Column({ type: "enum", enum: GenderPreference, default: GenderPreference.BOTH })
  genderPreference: GenderPreference;

  @Column({ type: "text", nullable: true })
  bio: string | null;

  @Column({ type: "simple-json", nullable: true })
  photos: string[] | null;

  @Column({ nullable: true })
  avatar: string | null;

  @Column({ nullable: true })
  jobTitle: string | null;

  @Column({ nullable: true })
  company: string | null;

  @Column({ nullable: true })
  school: string | null;

  @Column({ type: "simple-array", nullable: true })
  interests: string[] | null;

  // Love Counter custom texts (docs sếp có)
  @Column({ default: "Together For" })
  headerText: string;

  @Column({ default: 0 })
  footerTextType: number; // 0=Our First Day, 1=Custom

  @Column({ default: "" })
  footerCustomText: string;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isPremium: boolean;

  @Column({ default: false })
  isBanned: boolean;

  @Column({ default: 0 })
  tokenVersion: number;

  @Column({ select: false, nullable: true })
  refreshToken: string | null;

  @Column({ type: "timestamp", nullable: true })
  refreshTokenExp: Date | null;

  @Column({ type: "decimal", precision: 10, scale: 7, nullable: true })
  latitude: number | null;

  @Column({ type: "decimal", precision: 10, scale: 7, nullable: true })
  longitude: number | null;

  @Column({ type: "int", nullable: true })
  batteryLevel: number | null;

  @Column({ type: "boolean", nullable: true })
  isCharging: boolean | null;

  @Column({ type: "double precision", nullable: true })
  speed: number | null;

  @Column({ nullable: true, type: "timestamp" })
  lastActiveAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}                        
