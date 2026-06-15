import {
    Check,
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

export enum CoupleStatus {
    ACTIVE = "ACTIVE",
    DISCONNECTED = "DISCONNECTED"
}

@Check(`"user1Id" <> "user2Id"`)
@Index(["user1Id", "status"])
@Index(["user2Id", "status"])
@Entity("couples")
export class Couple {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @ManyToOne(() => User, { onDelete: "CASCADE" })
    @JoinColumn({ name: "user1Id" })
    user1: User;

    @Column({ type: "uuid" })
    user1Id: string;

    @ManyToOne(() => User, { nullable: true, onDelete: "CASCADE" })
    @JoinColumn({ name: "user2Id" })
    user2: User | null;

    @Column({ type: "uuid", nullable: true })
    user2Id: string | null;

    @Column({
        type: "enum",
        enum: CoupleStatus,
        default: CoupleStatus.ACTIVE
    })
    status: CoupleStatus;

    @Column({ type: "date", nullable: true })
    startDate: Date | null;

    @Column({ nullable: true, type: "timestamp" })
    startDateAt: Date | null;

    @Column({ nullable: true, type: "timestamp" })
    disconnectedAt: Date | null;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}



