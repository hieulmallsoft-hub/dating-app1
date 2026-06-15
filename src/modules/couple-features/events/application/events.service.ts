import { Injectable, NotFoundException, ForbiddenException, Logger } from "@nestjs/common";
import { EventRepository } from "../infrastructure/persistence/event.repository";
import { CoupleService } from "../../couple/application/couple.service";
import { CreateEventDto, UpdateEventDto } from "../presentation/dto/event-ops.dto";
import { Event } from "../domain/entities/event.entity";
import { NotificationsService } from "../../../common-user/notifications/application/notifications.service";
import { NotificationType } from "../../../common-user/notifications/domain/entities/notification.entity";

@Injectable()
export class EventsService {
    private readonly logger = new Logger(EventsService.name);

    constructor(
        private readonly eventRepository: EventRepository,
        private readonly coupleService: CoupleService,
        private readonly notificationsService: NotificationsService
    ) {}

    async createEvent(userId: string, dto: CreateEventDto) {
        const couple = await this.coupleService.getMyCouple(userId);

        const event = this.eventRepository.create({
            ...dto,
            date: new Date(dto.date),
            coupleId: couple.id,
            creatorId: userId
        });

        const saved = await this.eventRepository.save(event);
        await this.notifyPartnerForEvent(couple, userId, "created", saved);
        return saved;
    }

    async getEvents(userId: string) {
        const couple = await this.coupleService.getMyCouple(userId);
        return this.eventRepository.find({
            where: { coupleId: couple.id },
            order: { date: "ASC" }
        });
    }

    async updateEvent(userId: string, id: string, dto: UpdateEventDto) {
        const event = await this.eventRepository.findOne({ where: { id } });
        if (!event) throw new NotFoundException("Event not found");

        // Check if the event belongs to the user's couple
        const couple = await this.coupleService.getMyCouple(userId);
        if (event.coupleId !== couple.id) throw new ForbiddenException("Not your event");

        Object.assign(event, {
            ...dto,
            date: dto.date ? new Date(dto.date) : event.date
        });
        const saved = await this.eventRepository.save(event);
        await this.notifyPartnerForEvent(couple, userId, "updated", saved);
        return saved;
    }

    async deleteEvent(userId: string, id: string) {
        const event = await this.eventRepository.findOne({ where: { id } });
        if (!event) throw new NotFoundException("Event not found");

        const couple = await this.coupleService.getMyCouple(userId);
        if (event.coupleId !== couple.id) throw new ForbiddenException("Not your event");

        const deletedSnapshot = {
            title: event.title,
            date: event.date,
            isAnniversary: event.isAnniversary
        };
        await this.eventRepository.delete(id);
        await this.notifyPartnerForEvent(couple, userId, "deleted", deletedSnapshot);
        return { success: true };
    }

    private async notifyPartnerForEvent(
        couple: { user1Id: string; user2Id: string | null },
        actorId: string,
        action: "created" | "updated" | "deleted",
        event: { title: string; date: Date; isAnniversary?: boolean }
    ) {
        const partnerId = couple.user1Id === actorId ? couple.user2Id : couple.user1Id;
        if (!partnerId) return;

        const eventTitle = event.title?.trim() || "su kien";
        const eventDate = this.formatEventDate(event.date);
        const dateSuffix = eventDate ? ` (${eventDate})` : "";

        let title = "Su kien moi";
        let content = `Doi cua ban vua tao su kien "${eventTitle}"${dateSuffix}`;

        if (action === "updated") {
            title = "Su kien da cap nhat";
            content = `Doi cua ban vua cap nhat su kien "${eventTitle}"${dateSuffix}`;
        } else if (action === "deleted") {
            title = "Su kien da xoa";
            content = `Doi cua ban vua xoa su kien "${eventTitle}"${dateSuffix}`;
        } else if (event.isAnniversary) {
            title = "Ky niem moi";
            content = `Doi cua ban vua tao ky niem "${eventTitle}"${dateSuffix}`;
        }

        try {
            await this.notificationsService.createNotification(partnerId, title, content, NotificationType.EVENT);
        } catch (error) {
            this.logger.warn(`Create event notification failed: ${(error as Error)?.message || "unknown"}`);
        }
    }

    private formatEventDate(value: Date) {
        const date = value instanceof Date ? value : new Date(value);
        if (Number.isNaN(date.getTime())) return "";
        return date.toISOString().slice(0, 10);
    }
}
