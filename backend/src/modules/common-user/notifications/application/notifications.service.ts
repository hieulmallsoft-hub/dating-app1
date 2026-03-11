import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { NotificationRepository } from "../infrastructure/persistence/notification.repository";
import { NotificationGateway } from "../presentation/notification.gateway";

@Injectable()
export class NotificationsService {
    private readonly logger = new Logger(NotificationsService.name);

    constructor(
        private readonly notificationRepository: NotificationRepository,
        private readonly notificationGateway: NotificationGateway
    ) {}

    async getNotifications(userId: string) {
        return this.notificationRepository.find({
            where: { userId },
            order: { createdAt: "DESC" }
        });
    }

    async markAsRead(notificationId: string, userId: string) {
        const notification = await this.notificationRepository.findOne({
            where: { id: notificationId, userId }
        });

        if (!notification) throw new NotFoundException("Notification not found");

        notification.isRead = true;
        const saved = await this.notificationRepository.save(notification);

        try {
            this.notificationGateway.emitNotificationRead(userId, this.toEventPayload(saved));
        } catch (error) {
            this.logger.warn(`Emit notification:read failed: ${(error as Error)?.message || "unknown"}`);
        }

        return saved;
    }

    async createNotification(userId: string, title: string, content: string, type?: string) {
        const notification = this.notificationRepository.create({
            userId,
            title,
            content,
            type
        });
        const saved = await this.notificationRepository.save(notification);

        try {
            this.notificationGateway.emitNewNotification(userId, this.toEventPayload(saved));
        } catch (error) {
            this.logger.warn(`Emit notification:new failed: ${(error as Error)?.message || "unknown"}`);
        }

        return saved;
    }

    private toEventPayload(notification: {
        id: string;
        userId: string;
        title: string;
        content: string;
        type?: string | null;
        isRead: boolean;
        createdAt: Date | string;
    }) {
        return {
            id: notification.id,
            userId: notification.userId,
            title: notification.title,
            content: notification.content,
            type: notification.type ?? null,
            isRead: Boolean(notification.isRead),
            createdAt:
                notification.createdAt instanceof Date
                    ? notification.createdAt.toISOString()
                    : new Date(notification.createdAt).toISOString()
        };
    }
}
