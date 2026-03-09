import { Controller, Get, Post, Put, Delete, Body, Req, UseGuards, Param, UnauthorizedException } from "@nestjs/common";
import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiCreatedResponse,
    ApiForbiddenResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiTags,
    ApiUnauthorizedResponse
} from "@nestjs/swagger";
import { EventsService } from "../application/events.service";
import {
    CreateEventDto,
    EventActionResponseDto,
    EventResponseDto,
    UpdateEventDto
} from "./dto/event-ops.dto";
import { JwtAuthGuard } from "../../../common-user/auth/infrastructure/strategies/jwt-auth-guard";

@ApiTags("events")
@ApiBearerAuth("JWT-auth")
@Controller("events")
@UseGuards(JwtAuthGuard)
export class EventsController {
    constructor(private readonly eventsService: EventsService) {}

    @Get()
    @ApiOperation({
        summary: "Get couple events",
        description: "Returns event list of current user's couple (sorted by date ascending)."
    })
    @ApiOkResponse({
        description: "Events returned",
        type: EventResponseDto,
        isArray: true
    })
    @ApiNotFoundResponse({
        description: "Current user is not in a couple"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async getEvents(@Req() req) {
        return this.eventsService.getEvents(this.getCurrentUserId(req));
    }

    @Post()
    @ApiOperation({
        summary: "Create event",
        description: "Creates a new event for current couple."
    })
    @ApiCreatedResponse({
        description: "Event created",
        type: EventResponseDto
    })
    @ApiBadRequestResponse({
        description: "Validation failed (missing title/date or invalid date)"
    })
    @ApiNotFoundResponse({
        description: "Current user is not in a couple"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async createEvent(@Req() req, @Body() dto: CreateEventDto) {
        return this.eventsService.createEvent(this.getCurrentUserId(req), dto);
    }

    @Put(":id")
    @ApiOperation({
        summary: "Update event",
        description: "Updates an existing event by id."
    })
    @ApiParam({
        name: "id",
        description: "Event id",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
    })
    @ApiOkResponse({
        description: "Event updated",
        type: EventResponseDto
    })
    @ApiBadRequestResponse({
        description: "Validation failed"
    })
    @ApiNotFoundResponse({
        description: "Event not found"
    })
    @ApiForbiddenResponse({
        description: "Event does not belong to current user's couple"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async updateEvent(@Req() req, @Param("id") id: string, @Body() dto: UpdateEventDto) {
        return this.eventsService.updateEvent(this.getCurrentUserId(req), id, dto);
    }

    @Delete(":id")
    @ApiOperation({
        summary: "Delete event",
        description: "Deletes event by id."
    })
    @ApiParam({
        name: "id",
        description: "Event id",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
    })
    @ApiOkResponse({
        description: "Event deleted",
        type: EventActionResponseDto
    })
    @ApiNotFoundResponse({
        description: "Event not found"
    })
    @ApiForbiddenResponse({
        description: "Event does not belong to current user's couple"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
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



