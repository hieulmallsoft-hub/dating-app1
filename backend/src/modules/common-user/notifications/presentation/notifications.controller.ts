import { Body, Controller, Get, Param, Post, Put, Req, UnauthorizedException, UseGuards } from "@nestjs/common";
import {
    ApiBearerAuth,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiBody,
    ApiTags,
    ApiUnauthorizedResponse
} from "@nestjs/swagger";
import { NotificationsService } from "../application/notifications.service";
import { JwtAuthGuard } from "../../auth/infrastructure/strategies/jwt-auth-guard";
import { NotificationResponseDto } from "./dto/notification-ops.dto";
import { PushTokenAckDto, PushTokenBodyDto } from "./dto/push-token.dto";
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
    // lưu token của thiết bị để gửi thông báo đẩy sau này
    @Post("push-tokens/register")
    @ApiOperation({
        summary: "Register device push token",
        description:
            "Use this route when user logs in or when FCM token changes. Backend will save/update token for current user."
    })
    @ApiBody({ type: PushTokenBodyDto })
    @ApiOkResponse({
        description: "Device token has been saved",
        type: PushTokenAckDto
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async registerDevicePushToken(@Req() req, @Body() body: PushTokenBodyDto) {
        const deviceId = await this.registerPushTokenInternal(req, body);
        return { success: true, deviceId, idDevice: deviceId };
    }
    // xóa token khi user logout hoặc uninstall app để tránh gửi thông báo đẩy cho thiết bị đó nữa
    @Post("push-tokens/unregister")
    @ApiOperation({
        summary: "Unregister device push token",
        description:
            "Use this route on logout/uninstall to stop this device from receiving push notifications."
    })
    @ApiBody({ type: PushTokenBodyDto })
    @ApiOkResponse({
        description: "Device token has been removed",
        type: PushTokenAckDto
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async unregisterDevicePushToken(@Req() req, @Body() body: PushTokenBodyDto) {
        await this.unregisterPushTokenInternal(req, body);
        return { success: true };
    }

    private async registerPushTokenInternal(req: JwtRequestLike, body: PushTokenBodyDto) {
        return this.notificationsService.registerPushToken(
            this.getCurrentUserId(req),
            body.token,
            body.platform || "web"
        );
    }

    private async unregisterPushTokenInternal(req: JwtRequestLike, body: PushTokenBodyDto) {
        await this.notificationsService.unregisterPushToken(this.getCurrentUserId(req), body.token);
    }

    private getCurrentUserId(req: JwtRequestLike) {
        const userId = req.user?.sub || req.user?.id || req.user?.user_Id;
        if (!userId) {
            throw new UnauthorizedException("Invalid access token payload");
        }
        return userId;
    }
}
