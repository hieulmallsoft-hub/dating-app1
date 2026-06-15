import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  DeleteDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "../../../../common-user/user/domain/entities/user.entity";
import { Couple } from "../../../couple/domain/entities/couple.entity";
import { SyncPayloadStatus } from "../../../shared/sync-payload";

export type MediaType = "image" | "video";
export type MediaVisibility = "couple_only" | "friends" | "public";
export type MediaStatus = "processing" | "active" | "flagged" | "synced";

@Entity("media")
@Index("IDX_media_couple_createdAt", ["coupleId", "createdAt"])
@Index("IDX_media_couple_uploader_createdAt", ["coupleId", "uploaderId", "createdAt"])
export class Media {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Couple, { onDelete: "CASCADE" })
  @JoinColumn({ name: "coupleId" })
  couple: Couple;

  @Column()
  coupleId: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "uploaderId" })
  uploader: User;

  @Column()
  uploaderId: string;

  @Column({ nullable: true })
  url: string | null;

  @Column({ nullable: true })
  thumbUrl?: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  caption?: string;

  @Column({ type: "varchar", default: "image" })
  type: MediaType;

  @Column({ type: "varchar", nullable: true })
  downloadUrl?: string;

  @Column({ type: "varchar", default: "couple_only" })
  visibility: MediaVisibility;

  @Column({ type: "varchar", default: "active" })
  status: MediaStatus;

  @Column({ type: "varchar", length: 30, default: SyncPayloadStatus.UPLOADED })
  syncStatus: SyncPayloadStatus;

  @Column({ type: "simple-json", nullable: true })
  confirmedByUserIds: string[] | null;

  @Column({ type: "timestamp", nullable: true })
  confirmedAt: Date | null;

  @Column({ type: "timestamp", nullable: true })
  payloadDeletedAt: Date | null;

  @Column({ type: "timestamp", nullable: true })
  expiresAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}



