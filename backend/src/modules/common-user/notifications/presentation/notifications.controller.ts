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
        summary: "Get notification list",
        description: "Returns notifications for current user."
    })
    @ApiOkResponse({
        description: "Returns notification list",
        type: NotificationResponseDto,
        isArray: true
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async getNotifications(@Req() req) {
        return this.notificationsService.getNotifications(this.getCurrentUserId(req));
    }

    @Put(":id/read")
    @ApiOperation({
        summary: "Mark notification as read",
        description: "Mark one notification as read for current user."
    })
    @ApiParam({
        name: "id",
        description: "Notification ID",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
    })
    @ApiOkResponse({
        description: "Notification updated",
        type: NotificationResponseDto
    })
    @ApiNotFoundResponse({
        description: "Notification not found or does not belong to current user"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async markAsRead(@Req() req, @Param("id") id: string) {
        return this.notificationsService.markAsRead(id, this.getCurrentUserId(req));
    }

    @Post("test")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: "Create test notification",
        description: "Create test notification for current user. title/content/type are optional."
    })
    @ApiBody({
        type: CreateTestNotificationDto,
        required: false
    })
    @ApiOkResponse({
        description: "Test notification created",
        type: NotificationResponseDto
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
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

