import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { EventRepository } from "../infrastructure/persistence/event.repository";
import { CoupleService } from "../../couple/application/couple.service";
import { CreateEventDto, UpdateEventDto } from "../presentation/dto/event-ops.dto";
import { Event } from "../domain/entities/event.entity";

@Injectable()
export class EventsService {
    constructor(
        private readonly eventRepository: EventRepository,
        private readonly coupleService: CoupleService
    ) {}

    async createEvent(userId: string, dto: CreateEventDto) {
        const couple = await this.coupleService.getMyCouple(userId);

        const event = this.eventRepository.create({
            ...dto,
            date: new Date(dto.date),
            coupleId: couple.id,
            creatorId: userId
        });

        return this.eventRepository.save(event);
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
        return this.eventRepository.save(event);
    }

    async deleteEvent(userId: string, id: string) {
        const event = await this.eventRepository.findOne({ where: { id } });
        if (!event) throw new NotFoundException("Event not found");

        const couple = await this.coupleService.getMyCouple(userId);
        if (event.coupleId !== couple.id) throw new ForbiddenException("Not your event");

        await this.eventRepository.delete(id);
        return { success: true };
    }
}
