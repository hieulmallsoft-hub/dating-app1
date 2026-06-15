import { Injectable, Logger } from "@nestjs/common";
import { In, MoreThan } from "typeorm";
import { NotificationRepository } from "../infrastructure/persistence/notification.repository";
import { PushTokenRepository } from "../infrastructure/persistence/push-token.repository";
import { NotificationGateway } from "../presentation/notification.gateway";
import { FirebasePushService } from "./firebase-push.service";
import {
    NotificationType,
    normalizeNotificationType
} from "../domain/entities/notification.entity";

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

    async createNotification(
        userId: string,
        title: string,
        content: string,
        type?: NotificationType | string,
        data?: Record<string, string>
    ) {
        const normalizedType = normalizeNotificationType(type);
        const notification = this.notificationRepository.create({
            userId,
            title,
            content,
            type: normalizedType
        });
        const saved = await this.notificationRepository.save(notification);

        try {
            this.notificationGateway.emitNewNotification(userId, this.toEventPayload(saved, data));
        } catch (error) {
            this.logger.warn(`Emit notification:new failed: ${(error as Error)?.message || "unknown"}`);
        }

        await this.sendPushForNotification(saved.id, userId, title, content, normalizedType, data);

        return saved;
    }

    async createNotificationWithTimeWindow(
        userId: string,
        title: string,
        content: string,
        type: NotificationType | string,
        mergeWindowSeconds = 600
    ) {
        const normalizedType = normalizeNotificationType(type);

        const normalizedWindow = this.normalizeMergeWindow(mergeWindowSeconds);
        const cutoff = new Date(Date.now() - normalizedWindow * 1000);

        const recent = await this.notificationRepository.findOne({
            where: {
                userId,
                type: normalizedType,
                createdAt: MoreThan(cutoff)
            },
            order: { createdAt: "DESC" }
        });

        if (!recent) {
            return this.createNotification(userId, title, content, normalizedType);
        }

        const incomingBaseContent = this.stripMergeSuffix(content);
        const currentCount = this.extractMergeCount(recent.content);
        const mergedCount = currentCount + 1;
        recent.title = title;
        recent.content = this.appendMergeCount(incomingBaseContent, mergedCount);
        const saved = await this.notificationRepository.save(recent);

        try {
            this.notificationGateway.emitNewNotification(userId, this.toEventPayload(saved));
        } catch (error) {
            this.logger.warn(`Emit notification:new (merged) failed: ${(error as Error)?.message || "unknown"}`);
        }

        this.logger.debug(
            `Merged notification within ${normalizedWindow}s window: user=${userId}, type=${normalizedType}, count=${mergedCount}`
        );

        return saved;
    }

    private toEventPayload(
        notification: {
            id: string;
            userId: string;
            title: string;
            content: string;
            type?: NotificationType | string | null;
            createdAt: Date | string;
        },
        data?: Record<string, string>
    ) {
        return {
            id: notification.id,
            userId: notification.userId,
            title: notification.title,
            content: notification.content,
            type: normalizeNotificationType(notification.type),
            ...(data ? { data } : {}),
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
        type: NotificationType,
        data?: Record<string, string>
    ) {
        const tokens = await this.pushTokenRepository.find({
            where: { userId },
            select: ["token"]
        });
        if (!tokens.length) {
            this.logger.debug(`Skip push: user ${userId} has no registered token`);
            return;
        }

        const payload = {
            title: title.trim() || "Thong bao moi",
            body: this.truncateBody(content),
            data: {
                notificationId,
                type,
                ...(data ?? {})
            },
            link: "/",
            ttlSeconds: 3600 * 24
        };

        const result = await this.firebasePushService.sendToTokens(
            tokens.map((item) => item.token),
            payload
        );

        if (result.failed > 0) {
            this.logger.warn(
                `Push send partial failure for user ${userId}: sent=${result.sent}, failed=${result.failed}`
            );
        }

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

    private normalizeMergeWindow(value: number) {
        if (!Number.isFinite(value)) return 600;
        const safe = Math.floor(value);
        return Math.max(30, Math.min(3600, safe));
    }

    private stripMergeSuffix(content: string) {
        const clean = content.trim();
        return clean.replace(/\s+\(x\d+\)\s*$/, "").trim();
    }

    private extractMergeCount(content: string) {
        const matched = content.match(/\(x(\d+)\)\s*$/);
        if (!matched) return 1;
        const parsed = Number(matched[1]);
        if (!Number.isFinite(parsed) || parsed < 1) return 1;
        return Math.floor(parsed);
    }

    private appendMergeCount(base: string, count: number) {
        const normalizedBase = this.stripMergeSuffix(base);
        if (count <= 1) return normalizedBase;
        return `${normalizedBase} (x${count})`;
    }
}
