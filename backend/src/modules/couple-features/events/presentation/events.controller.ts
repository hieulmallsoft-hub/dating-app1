import { Controller, Get, Post, Put, Delete, Body, Req, UseGuards, Param, UnauthorizedException } from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import { EventsService } from "../application/events.service";
import { CreateEventDto, UpdateEventDto } from "./dto/event-ops.dto";
import { JwtAuthGuard } from "../../../common-user/auth/infrastructure/strategies/jwt-auth-guard";

@ApiBearerAuth("JWT-auth")
@Controller("events")
@UseGuards(JwtAuthGuard)
export class EventsController {
    constructor(private readonly eventsService: EventsService) {}

    @Get()
    async getEvents(@Req() req) {
        return this.eventsService.getEvents(this.getCurrentUserId(req));
    }

    @Post()
    async createEvent(@Req() req, @Body() dto: CreateEventDto) {
        return this.eventsService.createEvent(this.getCurrentUserId(req), dto);
    }

    @Put(":id")
    async updateEvent(@Req() req, @Param("id") id: string, @Body() dto: UpdateEventDto) {
        return this.eventsService.updateEvent(this.getCurrentUserId(req), id, dto);
    }

    @Delete(":id")
    async deleteEvent(@Req() req, @Param("id") id: string) {
        return this.eventsService.deleteEvent(this.getCurrentUserId(req), id);
    }

    private getCurrentUserId(req: { user?: { sub?: string; id?: string; user_Id?: string } }) {
        const userId = req.user?.sub || req.user?.id || req.user?.user_Id;
        if (!userId) {
            throw new UnauthorizedException("Invalid access token payload");
        }
        return userId;
    }
}



