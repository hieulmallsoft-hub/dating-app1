import { Injectable, NotFoundException } from "@nestjs/common";
import { MessageRepository } from "../infrastructure/persistence/message.repository";
import { CoupleService } from "../../couple/application/couple.service";
import { SendMessageDto } from "../presentation/dto/send-message.dto";
import { Message } from "../domain/entities/message.entity";

@Injectable()
export class ChatService {
    constructor(
        private readonly messageRepository: MessageRepository,
        private readonly coupleService: CoupleService
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
            coupleId: couple.id,
            senderId: userId
        });

        return this.messageRepository.save(message);
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
}
