import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { User } from "../../../../common-user/user/domain/entities/user.entity";

export enum InviteStatus {
    PENDING = "PENDING",
    ACCEPTED = "ACCEPTED",
    EXPIRED = "EXPIRED"
}

@Entity("invites")
export class Invite {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: "inviterId" })
    inviter: User;

    @Column()
    inviterId: string;

    @Column({ unique: true })
    inviteCode: string;

    @Column({
        type: "enum",
        enum: InviteStatus,
        default: InviteStatus.PENDING
    })
    status: InviteStatus;

    @Column({ type: "timestamp" })
    expiresAt: Date;

    @CreateDateColumn()
    createdAt: Date;
}



