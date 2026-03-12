import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { In } from "typeorm";
import { NotificationRepository } from "../infrastructure/persistence/notification.repository";
import { PushTokenRepository } from "../infrastructure/persistence/push-token.repository";
import { NotificationGateway } from "../presentation/notification.gateway";
import { FirebasePushService } from "./firebase-push.service";
import type { PushTokenPlatform } from "../domain/entities/push-token.entity";

@Injectable()
export class NotificationsService {
    private readonly logger = new Logger(NotificationsService.name);

    constructor(
        private readonly notificationRepository: NotificationRepository,
        private readonly pushTokenRepository: PushTokenRepository,
        private readonly notificationGateway: NotificationGateway,
        private readonly firebasePushService: FirebasePushService
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

        await this.sendPushForNotification(saved.id, userId, title, content, type);

        return saved;
    }

    async registerPushToken(userId: string, token: string, platform: PushTokenPlatform = "web") {
        const cleanToken = token.trim();
        if (!cleanToken) return null;

        await this.pushTokenRepository.upsert(
            {
                userId,
                token: cleanToken,
                platform
            },
            ["token"]
        );

        const savedPushToken = await this.pushTokenRepository.findOne({
            where: { token: cleanToken },
            select: ["id"]
        });

        return savedPushToken?.id ?? null;
    }

    async unregisterPushToken(userId: string, token: string) {
        const cleanToken = token.trim();
        if (!cleanToken) return;
        await this.pushTokenRepository.delete({
            userId,
            token: cleanToken
        });
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

    private async sendPushForNotification(
        notificationId: string,
        userId: string,
        title: string,
        content: string,
        type?: string
    ) {
        const tokens = await this.pushTokenRepository.find({
            where: { userId },
            select: ["token"]
        });
        if (!tokens.length) return;

        const payload = {
            title: title.trim() || "Thong bao moi",
            body: this.truncateBody(content),
            data: {
                notificationId,
                type: type || "general"
            },
            link: "/",
            ttlSeconds: 3600 * 24
        };

        const result = await this.firebasePushService.sendToTokens(
            tokens.map((item) => item.token),
            payload
        );

        if (result.invalidTokens.length) {
            await this.pushTokenRepository.delete({
                token: In(result.invalidTokens)
            });
        }
    }

    private truncateBody(content: string) {
        const clean = content.trim();
        if (!clean) return "Ban vua nhan thong bao moi";
        return clean.length > 180 ? `${clean.slice(0, 177)}...` : clean;
    }
}
