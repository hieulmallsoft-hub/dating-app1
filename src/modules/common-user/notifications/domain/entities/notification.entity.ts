import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { User } from "../../../user/domain/entities/user.entity";

export enum NotificationType {
    GENERAL = "GENERAL",
    CHAT = "CHAT",
    CHAT_IMAGE = "CHAT_IMAGE",
    CHAT_VOICE = "CHAT_VOICE",
    CHAT_LOCATION = "CHAT_LOCATION",
    COUPLE = "COUPLE",
    COUPLE_DISCONNECT = "COUPLE_DISCONNECT",
    COUPLE_START_DATE = "COUPLE_START_DATE",
    EVENT = "EVENT",
    MOMENT = "MOMENT",
    MOMENT_CREATED = "MOMENT_CREATED",
    MOMENT_UPDATED = "MOMENT_UPDATED",
    MOMENT_DELETED = "MOMENT_DELETED",
    MEDIA = "MEDIA",
    LOCATION = "LOCATION",
    LOCATION_CREATED = "LOCATION_CREATED",
    LOCATION_UPDATED = "LOCATION_UPDATED",
    LOCATION_DELETED = "LOCATION_DELETED",
    GEOFENCE = "GEOFENCE",
    INVITE = "INVITE",
    TRIP = "TRIP",
    TEST = "TEST"
}

const LEGACY_TYPE_ALIASES: Record<string, NotificationType> = {
    general: NotificationType.GENERAL,
    chat: NotificationType.CHAT,
    chat_message: NotificationType.CHAT,
    chat_text: NotificationType.CHAT,
    chat_image: NotificationType.CHAT_IMAGE,
    image_message: NotificationType.CHAT_IMAGE,
    chat_voice: NotificationType.CHAT_VOICE,
    voice_message: NotificationType.CHAT_VOICE,
    chat_location: NotificationType.CHAT_LOCATION,
    location_message: NotificationType.CHAT_LOCATION,
    couple: NotificationType.COUPLE,
    couple_disconnect: NotificationType.COUPLE_DISCONNECT,
    disconnect: NotificationType.COUPLE_DISCONNECT,
    couple_start_date: NotificationType.COUPLE_START_DATE,
    event: NotificationType.EVENT,
    moment: NotificationType.MOMENT,
    moment_created: NotificationType.MOMENT_CREATED,
    moment_create: NotificationType.MOMENT_CREATED,
    moment_new: NotificationType.MOMENT_CREATED,
    moment_updated: NotificationType.MOMENT_UPDATED,
    moment_update: NotificationType.MOMENT_UPDATED,
    moment_deleted: NotificationType.MOMENT_DELETED,
    moment_delete: NotificationType.MOMENT_DELETED,
    media: NotificationType.MEDIA,
    location: NotificationType.LOCATION,
    saved_location: NotificationType.LOCATION,
    place: NotificationType.LOCATION,
    saved_place: NotificationType.LOCATION,
    location_created: NotificationType.LOCATION_CREATED,
    location_create: NotificationType.LOCATION_CREATED,
    location_new: NotificationType.LOCATION_CREATED,
    place_created: NotificationType.LOCATION_CREATED,
    place_create: NotificationType.LOCATION_CREATED,
    place_new: NotificationType.LOCATION_CREATED,
    location_updated: NotificationType.LOCATION_UPDATED,
    location_update: NotificationType.LOCATION_UPDATED,
    place_updated: NotificationType.LOCATION_UPDATED,
    place_update: NotificationType.LOCATION_UPDATED,
    location_deleted: NotificationType.LOCATION_DELETED,
    location_delete: NotificationType.LOCATION_DELETED,
    place_deleted: NotificationType.LOCATION_DELETED,
    place_delete: NotificationType.LOCATION_DELETED,
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

    @CreateDateColumn()
    createdAt: Date;
}
