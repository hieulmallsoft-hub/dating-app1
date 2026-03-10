import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ValueTransformer
} from "typeorm";

export enum Gender { MALE=0, FEMALE=1, OTHER=2 }
export enum GenderPreference { MALE=0, FEMALE=1, BOTH=2 }
export enum AuthProvider { LOCAL="LOCAL", GOOGLE="GOOGLE", APPLE="APPLE" }
export enum UserRole { USER="USER", ADMIN="ADMIN" }

enum GenderDb {
  MALE = "MALE",
  FEMALE = "FEMALE",
  OTHER = "OTHER"
}

enum GenderPreferenceDb {
  MALE = "MALE",
  FEMALE = "FEMALE",
  BOTH = "BOTH"
}

const GENDER_PREFERENCE_TO_DB: Record<GenderPreference, GenderPreferenceDb> = {
  [GenderPreference.MALE]: GenderPreferenceDb.MALE,
  [GenderPreference.FEMALE]: GenderPreferenceDb.FEMALE,
  [GenderPreference.BOTH]: GenderPreferenceDb.BOTH
};

const GENDER_PREFERENCE_FROM_DB: Record<GenderPreferenceDb, GenderPreference> = {
  [GenderPreferenceDb.MALE]: GenderPreference.MALE,
  [GenderPreferenceDb.FEMALE]: GenderPreference.FEMALE,
  [GenderPreferenceDb.BOTH]: GenderPreference.BOTH
};

const GENDER_TO_DB: Record<Gender, GenderDb> = {
  [Gender.MALE]: GenderDb.MALE,
  [Gender.FEMALE]: GenderDb.FEMALE,
  [Gender.OTHER]: GenderDb.OTHER
};

const GENDER_FROM_DB: Record<GenderDb, Gender> = {
  [GenderDb.MALE]: Gender.MALE,
  [GenderDb.FEMALE]: Gender.FEMALE,
  [GenderDb.OTHER]: Gender.OTHER
};

const genderPreferenceTransformer: ValueTransformer = {
  to(value: GenderPreference | null | undefined) {
    if (value === null || value === undefined) {
      return value;
    }
    return GENDER_PREFERENCE_TO_DB[value] ?? GenderPreferenceDb.BOTH;
  },
  from(value: GenderPreferenceDb | null | undefined) {
    if (value === null || value === undefined) {
      return GenderPreference.BOTH;
    }
    return GENDER_PREFERENCE_FROM_DB[value] ?? GenderPreference.BOTH;
  }
};

const genderTransformer: ValueTransformer = {
  to(value: Gender | null | undefined) {
    if (value === null || value === undefined) {
      return null;
    }
    return GENDER_TO_DB[value] ?? null;
  },
  from(value: GenderDb | null | undefined) {
    if (value === null || value === undefined) {
      return null;
    }
    return GENDER_FROM_DB[value] ?? null;
  }
};

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

  @Column({ nullable: true })
  sub: string | null;

  @Index()
  @Column({ unique: true })
  email: string;

  @Column({ unique: true, length: 6, nullable: true })
  accountCode: string | null;

  @Column({ select: false, nullable: true })
  password: string | null;

  @Column({ nullable: true })
  fullName: string | null;

  @Column({ nullable: true })
  phoneNumber: string | null;

  @Column({ nullable: true, type: "date" })
  birthDate: Date | null;

  @Column({
    type: "enum",
    enum: GenderDb,
    nullable: true,
    transformer: genderTransformer
  })
  gender: Gender | null;

  @Column({
    type: "enum",
    enum: GenderPreferenceDb,
    default: GenderPreferenceDb.BOTH,
    transformer: genderPreferenceTransformer
  })
  genderPreference: GenderPreference;

  @Column({ type: "text", nullable: true })
  bio: string | null;

  @Column({ nullable: true })
  avatar: string | null;

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
