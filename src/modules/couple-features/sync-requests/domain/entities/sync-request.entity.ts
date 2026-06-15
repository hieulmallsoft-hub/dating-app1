import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from "typeorm";
import { User } from "../../../../common-user/user/domain/entities/user.entity";
import { Couple } from "../../../couple/domain/entities/couple.entity";

export enum SyncRequestStatus {
    PENDING = "pending",
    UPLOADED = "uploaded",
    DOWNLOADED = "downloaded",
    CONFIRMED = "confirmed",
    EXPIRED = "expired",
    CANCELLED = "cancelled"
}

@Index(["coupleId", "status"])
@Index(["requesterId", "status"])
@Index(["providerId", "status"])
@Entity("sync_requests")
export class SyncRequest {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @ManyToOne(() => Couple, { onDelete: "CASCADE" })
    @JoinColumn({ name: "coupleId" })
    couple: Couple;

    @Column({ type: "uuid" })
    coupleId: string;

    @ManyToOne(() => User, { onDelete: "CASCADE" })
    @JoinColumn({ name: "requesterId" })
    requester: User;

    @Column({ type: "uuid" })
    requesterId: string;

    @ManyToOne(() => User, { onDelete: "CASCADE" })
    @JoinColumn({ name: "providerId" })
    provider: User;

    @Column({ type: "uuid" })
    providerId: string;

    @Column({ type: "varchar", length: 30, default: SyncRequestStatus.PENDING })
    status: SyncRequestStatus;

    @Column({ type: "text", nullable: true })
    note: string | null;

    @Column({ type: "varchar", length: 255, nullable: true })
    originalFileName: string | null;

    @Column({ type: "varchar", length: 80, nullable: true })
    mimeType: string | null;

    @Column({ type: "int", nullable: true })
    fileSize: number | null;

    @Column({ type: "varchar", length: 512, nullable: true })
    storageKey: string | null;

    @Column({ type: "timestamp", nullable: true })
    uploadedAt: Date | null;

    @Column({ type: "timestamp", nullable: true })
    downloadedAt: Date | null;

    @Column({ type: "timestamp", nullable: true })
    confirmedAt: Date | null;

    @Column({ type: "timestamp", nullable: true })
    payloadDeletedAt: Date | null;

    @Column({ type: "timestamp", nullable: true })
    expiresAt: Date | null;

    @Column({ type: "timestamp", nullable: true })
    cancelledAt: Date | null;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
