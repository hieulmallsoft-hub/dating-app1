import { Injectable, Logger } from "@nestjs/common";
import { MessageRepository } from "../infrastructure/persistence/message.repository";
import { CoupleService } from "../../couple/application/couple.service";
import { SendMessageDto } from "../presentation/dto/send-message.dto";
import { MessageType } from "../domain/entities/message.entity";
import { NotificationsService } from "../../../common-user/notifications/application/notifications.service";
import { NotificationType } from "../../../common-user/notifications/domain/entities/notification.entity";

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

        return this.messageRepository.find({
            where: { coupleId: couple.id },
            order: { createdAt: "DESC" },
            take: limit,
            skip: offset,
            relations: ["sender"]
        });
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
            senderId: userId
        });

        const saved = await this.messageRepository.save(message);
        await this.notifyPartnerForMessage(couple, userId, dto);
        return saved;
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

    private async notifyPartnerForMessage(
        couple: { user1Id: string; user2Id: string | null },
        senderId: string,
        dto: SendMessageDto
    ) {
        const partnerId = couple.user1Id === senderId ? couple.user2Id : couple.user1Id;
        if (!partnerId) return;

        const preview = this.buildMessagePreview(dto);
        try {
            await this.notificationsService.createNotification(
                partnerId,
                "Tin nhan moi",
                preview,
                NotificationType.CHAT
            );
        } catch (error) {
            this.logger.warn(`Create chat notification failed: ${(error as Error)?.message || "unknown"}`);
        }
    }

    private buildMessagePreview(dto: SendMessageDto) {
        if (dto.type !== MessageType.TEXT) {
            if (dto.type === MessageType.IMAGE) return "Doi cua ban vua gui mot anh";
            if (dto.type === MessageType.VOICE) return "Doi cua ban vua gui mot tin nhan voice";
            if (dto.type === MessageType.LOCATION) return "Doi cua ban vua chia se vi tri";
            return "Ban vua nhan tin nhan moi";
        }

        const trimmed = dto.content.trim();
        if (!trimmed) return "Ban vua nhan tin nhan moi";
        return trimmed.length > 120 ? `${trimmed.slice(0, 117)}...` : trimmed;
    }
}
