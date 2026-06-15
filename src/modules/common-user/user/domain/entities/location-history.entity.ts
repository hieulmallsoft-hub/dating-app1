import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./user.entity";

export enum LocationSource {
  REALTIME = "REALTIME",
  BATCH = "BATCH"
}

@Index(["coupleId", "userId", "recordedAt"])
@Index(["recordedAt"])
@Entity("location_histories")
export class LocationHistory {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ type: "uuid" })
  userId: string;

  @Column({ type: "uuid" })
  coupleId: string;

  @Column({ type: "double precision" })
  latitude: number;

  @Column({ type: "double precision" })
  longitude: number;

  @Column({ type: "double precision", nullable: true })
  accuracy: number | null;

  @Column({ type: "double precision", nullable: true })
  speed: number | null;

  @Column({ type: "double precision", nullable: true })
  heading: number | null;

  // thời điểm GPS đo được (quan trọng cho offline sync)
  @Column({ type: "timestamp" })
  recordedAt: Date;

  @Column({ type: "enum", enum: LocationSource, default: LocationSource.REALTIME })
  source: LocationSource;

  @CreateDateColumn()
  createdAt: Date;
}
