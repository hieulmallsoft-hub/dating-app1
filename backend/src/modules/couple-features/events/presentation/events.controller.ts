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
        summary: "L?y danh sách s? ki?n c?a c?p dôi",
        description: "Tr? v? danh sách s? ki?n c?a c?p dôi hi?n t?i (s?p x?p theo ngày tang d?n)."
    })
    @ApiOkResponse({
        description: "Ðã tr? v? danh sách s? ki?n",
        type: EventResponseDto,
        isArray: true
    })
    @ApiNotFoundResponse({
        description: "Ngu?i dùng hi?n t?i chua ghép dôi"
    })
    @ApiUnauthorizedResponse({
        description: "Thi?u token truy c?p ho?c token không h?p l?"
    })
    async getEvents(@Req() req) {
        return this.eventsService.getEvents(this.getCurrentUserId(req));
    }

    @Post()
    @ApiOperation({
        summary: "T?o s? ki?n",
        description: "T?o s? ki?n m?i cho c?p dôi hi?n t?i."
    })
    @ApiCreatedResponse({
        description: "Ðã t?o s? ki?n",
        type: EventResponseDto
    })
    @ApiBadRequestResponse({
        description: "D? li?u không h?p l? (thi?u title/date ho?c date sai d?nh d?ng)"
    })
    @ApiNotFoundResponse({
        description: "Ngu?i dùng hi?n t?i chua ghép dôi"
    })
    @ApiUnauthorizedResponse({
        description: "Thi?u token truy c?p ho?c token không h?p l?"
    })
    async createEvent(@Req() req, @Body() dto: CreateEventDto) {
        return this.eventsService.createEvent(this.getCurrentUserId(req), dto);
    }

    @Put(":id")
    @ApiOperation({
        summary: "C?p nh?t s? ki?n",
        description: "C?p nh?t s? ki?n theo id."
    })
    @ApiParam({
        name: "id",
        description: "ID s? ki?n",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
    })
    @ApiOkResponse({
        description: "Ðã c?p nh?t s? ki?n",
        type: EventResponseDto
    })
    @ApiBadRequestResponse({
        description: "D? li?u không h?p l?"
    })
    @ApiNotFoundResponse({
        description: "Không tìm th?y s? ki?n"
    })
    @ApiForbiddenResponse({
        description: "S? ki?n không thu?c c?p dôi c?a ngu?i dùng hi?n t?i"
    })
    @ApiUnauthorizedResponse({
        description: "Thi?u token truy c?p ho?c token không h?p l?"
    })
    async updateEvent(@Req() req, @Param("id") id: string, @Body() dto: UpdateEventDto) {
        return this.eventsService.updateEvent(this.getCurrentUserId(req), id, dto);
    }

    @Delete(":id")
    @ApiOperation({
        summary: "Xóa s? ki?n",
        description: "Xóa s? ki?n theo id."
    })
    @ApiParam({
        name: "id",
        description: "ID s? ki?n",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
    })
    @ApiOkResponse({
        description: "Ðã xóa s? ki?n",
        type: EventActionResponseDto
    })
    @ApiNotFoundResponse({
        description: "Không tìm th?y s? ki?n"
    })
    @ApiForbiddenResponse({
        description: "S? ki?n không thu?c c?p dôi c?a ngu?i dùng hi?n t?i"
    })
    @ApiUnauthorizedResponse({
        description: "Thi?u token truy c?p ho?c token không h?p l?"
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




