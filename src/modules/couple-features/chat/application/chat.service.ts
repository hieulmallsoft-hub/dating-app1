import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { MessageRepository } from "../infrastructure/persistence/message.repository";
import { CoupleService } from "../../couple/application/couple.service";
import { SendMessageDto } from "../presentation/dto/send-message.dto";
import { MessageType } from "../domain/entities/message.entity";
import { NotificationsService } from "../../../common-user/notifications/application/notifications.service";
import { NotificationType } from "../../../common-user/notifications/domain/entities/notification.entity";
import {
    getRequiredCoupleUserIds,
    mergeConfirmedUserIds,
    resolveSyncStatus,
    SyncPayloadStatus
} from "../../shared/sync-payload";

@Injectable()
export class ChatService {
    private readonly logger = new Logger(ChatService.name);

    constructor(
        private readonly messageRepository: MessageRepository,
        private readonly coupleService: CoupleService,
        private readonly notificationsService: NotificationsService
    ) {}

    async getMessages(userId: string, limit: number = 50, offset: number = 0) {
        const couple = await this.coupleService.getMyCouple(userId);

        return this.messageRepository
            .createQueryBuilder("message")
            .leftJoinAndSelect("message.sender", "sender")
            .where("message.coupleId = :coupleId", { coupleId: couple.id })
            .andWhere("(message.syncStatus IS NULL OR message.syncStatus <> :payloadDeleted)", {
                payloadDeleted: SyncPayloadStatus.PAYLOAD_DELETED
            })
            .orderBy("message.createdAt", "DESC")
            .take(limit)
            .skip(offset)
            .getMany();
    }

    async saveMessage(userId: string, dto: SendMessageDto) {
        const couple = await this.coupleService.getMyCouple(userId);

        const message = this.messageRepository.create({
            ...dto,
            latitude: dto.lat ?? null,
            longitude: dto.lng ?? null,
            locationName: dto.locationName?.trim() || null,
            locationAddress: dto.locationAddress?.trim() || null,
            coupleId: couple.id,
            senderId: userId,
            syncStatus: SyncPayloadStatus.UPLOADED,
            confirmedByUserIds: [userId]
        });

        const saved = await this.messageRepository.save(message);
        await this.notifyPartnerForMessage(couple, userId, dto);
        return saved;
    }

    async confirmMessageSynced(userId: string, messageId: string) {
        const couple = await this.coupleService.getMyCouple(userId);
        const message = await this.messageRepository.findOne({
            where: { id: messageId, coupleId: couple.id }
        });

        if (!message) {
            throw new NotFoundException("Message not found");
        }

        if (message.syncStatus === SyncPayloadStatus.PAYLOAD_DELETED) {
            return this.buildSyncConfirmResponse(message);
        }

        const confirmedByUserIds = mergeConfirmedUserIds(message.confirmedByUserIds, userId);
        const requiredUserIds = getRequiredCoupleUserIds(couple);
        const nextStatus = resolveSyncStatus(confirmedByUserIds, requiredUserIds);

        message.confirmedByUserIds = confirmedByUserIds;
        message.syncStatus = nextStatus;
        if (nextStatus === SyncPayloadStatus.CONFIRMED) {
            this.clearMessagePayload(message);
        }

        const saved = await this.messageRepository.save(message);
        return this.buildSyncConfirmResponse(saved);
    }

    async markAsRead(userId: string) {
        const couple = await this.coupleService.getMyCouple(userId);
        const partnerId = couple.user1Id === userId ? couple.user2Id : couple.user1Id;

        await this.messageRepository.update(
            { coupleId: couple.id, senderId: partnerId, isRead: false },
            { isRead: true }
        );

        return { success: true };
    }

    async clearChat(userId: string) {
        const couple = await this.coupleService.getMyCouple(userId);
        await this.messageRepository.delete({ coupleId: couple.id });
        return { success: true };
    }

    private clearMessagePayload(message: {
        content: string | null;
        latitude: number | null;
        longitude: number | null;
        locationName: string | null;
        locationAddress: string | null;
        syncStatus: SyncPayloadStatus;
        confirmedAt: Date | null;
        payloadDeletedAt: Date | null;
    }) {
        const now = new Date();
        message.content = null;
        message.latitude = null;
        message.longitude = null;
        message.locationName = null;
        message.locationAddress = null;
        message.syncStatus = SyncPayloadStatus.PAYLOAD_DELETED;
        message.confirmedAt = now;
        message.payloadDeletedAt = now;
    }

    private buildSyncConfirmResponse(message: {
        id: string;
        syncStatus: SyncPayloadStatus | string;
        confirmedByUserIds?: string[] | null;
        confirmedAt?: Date | null;
        payloadDeletedAt?: Date | null;
    }) {
        return {
            success: true,
            id: message.id,
            syncStatus: message.syncStatus,
            confirmedByUserIds: message.confirmedByUserIds ?? [],
            confirmedAt: message.confirmedAt,
            payloadDeletedAt: message.payloadDeletedAt
        };
    }

    private async notifyPartnerForMessage(
        couple: { user1Id: string; user2Id: string | null },
        senderId: string,
        dto: SendMessageDto
    ) {
        const partnerId = couple.user1Id === senderId ? couple.user2Id : couple.user1Id;
        if (!partnerId) return;

        const preview = this.buildMessagePreview(dto);
        const notificationType = this.resolveChatNotificationType(dto.type);
        try {
            await this.notificationsService.createNotification(
                partnerId,
                "Tin nhan moi",
                preview,
                notificationType,
                { messageType: dto.type }
            );
        } catch (error) {
            this.logger.warn(`Create chat notification failed: ${(error as Error)?.message || "unknown"}`);
        }
    }

    private buildMessagePreview(dto: SendMessageDto) {
        const trimmed = dto.content.trim();
        if (!trimmed) return "Ban vua nhan tin nhan moi";
        return trimmed.length > 120 ? `${trimmed.slice(0, 117)}...` : trimmed;
    }

    private resolveChatNotificationType(messageType: MessageType) {
        if (messageType === MessageType.IMAGE) return NotificationType.CHAT_IMAGE;
        if (messageType === MessageType.VOICE) return NotificationType.CHAT_VOICE;
        if (messageType === MessageType.LOCATION) return NotificationType.CHAT_LOCATION;
        return NotificationType.CHAT;
    }
}
