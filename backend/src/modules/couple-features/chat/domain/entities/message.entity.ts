import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { User } from "../../../../common-user/user/domain/entities/users.enity";
import { Couple } from "../../../couple/domain/entities/couple.entity";

export enum MessageType {
    TEXT = "TEXT",
    IMAGE = "IMAGE",
    VOICE = "VOICE",
    LOCATION = "LOCATION"
}

@Entity("messages")
export class Message {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @ManyToOne(() => Couple)
    @JoinColumn({ name: "coupleId" })
    couple: Couple;

    @Column()
    coupleId: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: "senderId" })
    sender: User;

    @Column()
    senderId: string;

    @Column({
        type: "enum",
        enum: MessageType,
        default: MessageType.TEXT
    })
    type: MessageType;

    @Column({ type: "text", nullable: true })
    content: string;

    @Column({ default: false })
    isRead: boolean;

    @CreateDateColumn()
    createdAt: Date;
}



