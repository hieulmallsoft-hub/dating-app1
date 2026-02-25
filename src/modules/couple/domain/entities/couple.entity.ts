import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from "typeorm";
import { User } from "../../../user/domain/entities/users.model";

export enum CoupleStatus {
    ACTIVE = "ACTIVE",
    DISCONNECTED = "DISCONNECTED"
}

@Entity("couples")
export class Couple {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: "user1Id" })
    user1: User;

    @Column()
    user1Id: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: "user2Id" })
    user2: User;

    @Column({ nullable: true })
    user2Id: string;

    @Column({
        type: "enum",
        enum: CoupleStatus,
        default: CoupleStatus.ACTIVE
    })
    status: CoupleStatus;

    @Column({ type: "timestamp", nullable: true })
    startDate: Date;

    @Column({ nullable: true })
    theme: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
