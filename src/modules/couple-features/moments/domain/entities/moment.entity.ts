import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn
} from "typeorm";
import { User } from "../../../../common-user/user/domain/entities/user.entity";
import { Couple } from "../../../couple/domain/entities/couple.entity";
import { SyncPayloadStatus } from "../../../shared/sync-payload";

export enum MomentPrivacy {
    COUPLE = "COUPLE",
    PRIVATE = "PRIVATE"
}

@Entity("moments")
export class Moment {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @ManyToOne(() => Couple)
    @JoinColumn({ name: "coupleId" })
    couple: Couple;

    @Column()
    coupleId: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: "creatorId" })
    creator: User;

    @Column()
    creatorId: string;

    @Column({ type: "text", nullable: true })
    content: string;

  @Column({ type: "simple-json", nullable: true })
  photos: string[];

  @Column({ type: "double precision", nullable: true })
  latitude: number | null;

  @Column({ type: "double precision", nullable: true })
  longitude: number | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  locationName: string | null;

  @Column({ type: "text", nullable: true })
  locationAddress: string | null;

    @Column({
      type: "enum",
      enum: MomentPrivacy,
      default: MomentPrivacy.COUPLE
    })
    privacy: MomentPrivacy;

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
}



