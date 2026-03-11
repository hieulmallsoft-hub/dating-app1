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
import { toEventResponse, toEventResponseList } from "./mappers/event-response.mapper";

@ApiTags("events")
@ApiBearerAuth("JWT-auth")
@Controller("events")
@UseGuards(JwtAuthGuard)
export class EventsController {
    constructor(private readonly eventsService: EventsService) {}

    @Get()
    @ApiOperation({
        summary: "Get couple event list",
        description: "Returns event list for current couple (sorted by date ascending)."
    })
    @ApiOkResponse({
        description: "Returns event list",
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
        const events = await this.eventsService.getEvents(this.getCurrentUserId(req));
        return toEventResponseList(events);
    }

    @Post()
    @ApiOperation({
        summary: "Create event",
        description: "Create new event for current couple."
    })
    @ApiCreatedResponse({
        description: "Event created",
        type: EventResponseDto
    })
    @ApiBadRequestResponse({
        description: "Invalid payload (missing title/date or invalid date format)"
    })
    @ApiNotFoundResponse({
        description: "Current user is not in a couple"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async createEvent(@Req() req, @Body() dto: CreateEventDto) {
        const event = await this.eventsService.createEvent(this.getCurrentUserId(req), dto);
        return toEventResponse(event);
    }

    @Put(":id")
    @ApiOperation({
        summary: "Update event",
        description: "Update event by id."
    })
    @ApiParam({
        name: "id",
        description: "Event ID",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
    })
    @ApiOkResponse({
        description: "Event updated",
        type: EventResponseDto
    })
    @ApiBadRequestResponse({
        description: "Invalid payload"
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
        const event = await this.eventsService.updateEvent(this.getCurrentUserId(req), id, dto);
        return toEventResponse(event);
    }

    @Delete(":id")
    @ApiOperation({
        summary: "Delete event",
        description: "Delete event by id."
    })
    @ApiParam({
        name: "id",
        description: "Event ID",
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




