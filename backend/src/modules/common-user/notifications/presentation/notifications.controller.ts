import { Controller, Get, Put, Req, UseGuards, Param, UnauthorizedException, Post, Body, HttpCode, HttpStatus } from "@nestjs/common";
import {
    ApiBearerAuth,
    ApiBody,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiTags,
    ApiUnauthorizedResponse
} from "@nestjs/swagger";
import { NotificationsService } from "../application/notifications.service";
import { JwtAuthGuard } from "../../auth/infrastructure/strategies/jwt-auth-guard";
import {
    CreateTestNotificationDto,
    NotificationResponseDto
} from "./dto/notification-ops.dto";

@ApiTags("notifications")
@ApiBearerAuth("JWT-auth")
@Controller("notifications")
@UseGuards(JwtAuthGuard)
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) {}

    @Get()
    @ApiOperation({
        summary: "L?y danh sách thông báo",
        description: "Tr? v? danh sách thông báo c?a ngu?i dùng hi?n t?i."
    })
    @ApiOkResponse({
        description: "Ðã tr? v? danh sách thông báo",
        type: NotificationResponseDto,
        isArray: true
    })
    @ApiUnauthorizedResponse({
        description: "Thi?u token truy c?p ho?c token không h?p l?"
    })
    async getNotifications(@Req() req) {
        return this.notificationsService.getNotifications(this.getCurrentUserId(req));
    }

    @Put(":id/read")
    @ApiOperation({
        summary: "Ðánh d?u thông báo dã d?c",
        description: "Ðánh d?u m?t thông báo là dã d?c cho ngu?i dùng hi?n t?i."
    })
    @ApiParam({
        name: "id",
        description: "ID thông báo",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
    })
    @ApiOkResponse({
        description: "Ðã c?p nh?t thông báo",
        type: NotificationResponseDto
    })
    @ApiNotFoundResponse({
        description: "Không tìm th?y thông báo ho?c thông báo không thu?c ngu?i dùng hi?n t?i"
    })
    @ApiUnauthorizedResponse({
        description: "Thi?u token truy c?p ho?c token không h?p l?"
    })
    async markAsRead(@Req() req, @Param("id") id: string) {
        return this.notificationsService.markAsRead(id, this.getCurrentUserId(req));
    }

    @Post("test")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: "T?o thông báo test",
        description: "T?o thông báo test cho ngu?i dùng hi?n t?i. title/content/type là tùy ch?n."
    })
    @ApiBody({
        type: CreateTestNotificationDto,
        required: false
    })
    @ApiOkResponse({
        description: "Ðã t?o thông báo test",
        type: NotificationResponseDto
    })
    @ApiUnauthorizedResponse({
        description: "Thi?u token truy c?p ho?c token không h?p l?"
    })
    async createTestNotification(
        @Req() req,
        @Body() dto: CreateTestNotificationDto
    ) {
        const userId = this.getCurrentUserId(req);
        const fallbackTitle = "Test notification";
        const fallbackContent = `Created at ${new Date().toISOString()}`;
        return this.notificationsService.createNotification(
            userId,
            dto.title?.trim() || fallbackTitle,
            dto.content?.trim() || fallbackContent,
            dto.type?.trim() || "test"
        );
    }

    private getCurrentUserId(req: { user?: { sub?: string; id?: string; user_Id?: string } }) {
        const userId = req.user?.sub || req.user?.id || req.user?.user_Id;
        if (!userId) {
            throw new UnauthorizedException("Invalid access token payload");
        }
        return userId;
    }
}

