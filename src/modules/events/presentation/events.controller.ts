import { Controller, Get, Post, Put, Delete, Body, Req, UseGuards, Param } from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import { EventsService } from "../application/events.service";
import { CreateEventDto, UpdateEventDto } from "./dto/event-ops.dto";
import { JwtAuthGuard } from "../../auth/infrastructure/strategies/jwt-auth-guard";

@ApiBearerAuth("JWT-auth")
@Controller("events")
@UseGuards(JwtAuthGuard)
export class EventsController {
    constructor(private readonly eventsService: EventsService) {}

    @Get()
    async getEvents(@Req() req) {
        return this.eventsService.getEvents(req.user.sub);
    }

    @Post()
    async createEvent(@Req() req, @Body() dto: CreateEventDto) {
        return this.eventsService.createEvent(req.user.sub, dto);
    }

    @Put(":id")
    async updateEvent(@Req() req, @Param("id") id: string, @Body() dto: UpdateEventDto) {
        return this.eventsService.updateEvent(req.user.sub, id, dto);
    }

    @Delete(":id")
    async deleteEvent(@Req() req, @Param("id") id: string) {
        return this.eventsService.deleteEvent(req.user.sub, id);
    }
}
