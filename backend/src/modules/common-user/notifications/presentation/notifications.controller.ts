import { Controller, Get, Param, Put, Req, UnauthorizedException, UseGuards } from "@nestjs/common";
import {
    ApiBearerAuth,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiTags,
    ApiUnauthorizedResponse
} from "@nestjs/swagger";
import { NotificationsService } from "../application/notifications.service";
import { JwtAuthGuard } from "../../auth/infrastructure/strategies/jwt-auth-guard";
import { NotificationResponseDto } from "./dto/notification-ops.dto";
import {
    toNotificationResponse,
    toNotificationResponseList
} from "./mappers/notification-response.mapper";

type JwtRequestLike = { user?: { sub?: string; id?: string; user_Id?: string } };

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
        const notifications = await this.notificationsService.getNotifications(this.getCurrentUserId(req));
        return toNotificationResponseList(notifications);
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
        const notification = await this.notificationsService.markAsRead(id, this.getCurrentUserId(req));
        return toNotificationResponse(notification);
    }

    private getCurrentUserId(req: JwtRequestLike) {
        const userId = req.user?.sub || req.user?.id || req.user?.user_Id;
        if (!userId) {
            throw new UnauthorizedException("Invalid access token payload");
        }
        return userId;
    }
}
