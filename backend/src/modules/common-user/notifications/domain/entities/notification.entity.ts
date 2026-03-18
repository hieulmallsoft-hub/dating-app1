import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { User } from "../../../user/domain/entities/user.entity";

export enum NotificationType {
    GENERAL = "GENERAL",
    CHAT = "CHAT",
    COUPLE = "COUPLE",
    COUPLE_DISCONNECT = "COUPLE_DISCONNECT",
    COUPLE_START_DATE = "COUPLE_START_DATE",
    EVENT = "EVENT",
    MOMENT = "MOMENT",
    MEDIA = "MEDIA",
    GEOFENCE = "GEOFENCE",
    INVITE = "INVITE",
    TRIP = "TRIP",
    TEST = "TEST"
}

const LEGACY_TYPE_ALIASES: Record<string, NotificationType> = {
    general: NotificationType.GENERAL,
    chat: NotificationType.CHAT,
    chat_message: NotificationType.CHAT,
    couple: NotificationType.COUPLE,
    couple_disconnect: NotificationType.COUPLE_DISCONNECT,
    disconnect: NotificationType.COUPLE_DISCONNECT,
    couple_start_date: NotificationType.COUPLE_START_DATE,
    event: NotificationType.EVENT,
    moment: NotificationType.MOMENT,
    media: NotificationType.MEDIA,
    geofence: NotificationType.GEOFENCE,
    invite: NotificationType.INVITE,
    trip: NotificationType.TRIP,
    test: NotificationType.TEST
};

const NOTIFICATION_TYPE_SET = new Set<string>(Object.values(NotificationType));

export function normalizeNotificationType(value?: string | NotificationType | null): NotificationType {
    if (!value) {
        return NotificationType.GENERAL;
    }

    const raw = String(value).trim();
    if (!raw) {
        return NotificationType.GENERAL;
    }

    const upper = raw.toUpperCase();
    if (NOTIFICATION_TYPE_SET.has(upper)) {
        return upper as NotificationType;
    }

    const alias = LEGACY_TYPE_ALIASES[raw.toLowerCase()];
    return alias ?? NotificationType.GENERAL;
}

@Entity("notifications")
export class Notification {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: "userId" })
    user: User;

    @Column()
    userId: string;

    @Column()
    title: string;

    @Column({ type: "text" })
    content: string;

    @Column({ nullable: true, default: NotificationType.GENERAL })
    type: NotificationType | null;

    @Column({ default: false })
    isRead: boolean;

    @CreateDateColumn()
    createdAt: Date;
}
