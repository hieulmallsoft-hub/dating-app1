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
import { User } from "../../../user/domain/entities/user.entity";

export const PUSH_TOKEN_PLATFORMS = ["web", "android", "ios", "unknown"] as const;
export type PushTokenPlatform = (typeof PUSH_TOKEN_PLATFORMS)[number];

@Entity("user_push_tokens")
@Index(["userId"])
@Index(["token"], { unique: true })
export class PushToken {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @ManyToOne(() => User, { onDelete: "CASCADE" })
    @JoinColumn({ name: "userId" })
    user: User;

    @Column()
    userId: string;

    @Column({ type: "text" })
    token: string;

    @Column({ type: "varchar", length: 20, default: "web" })
    platform: PushTokenPlatform;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
