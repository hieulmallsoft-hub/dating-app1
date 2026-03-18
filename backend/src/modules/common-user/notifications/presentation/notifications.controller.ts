import { BadRequestException, Body, Controller, Get, Param, Post, Put, Req, UnauthorizedException, UseGuards } from "@nestjs/common";
import {
    ApiBody,
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
import { AuthService } from "../../auth/application/auth.service";
import { NotificationResponseDto } from "./dto/notification-ops.dto";
import {
    FcmTokenBodyDto,
    FcmTokenRegisterResponseDto,
    LogoutResponseDto,
    RegisterFcmTokenDto
} from "../../auth/presentation/dto/auth-ops.dto";
import {
    toNotificationResponse,
    toNotificationResponseList
} from "./mappers/notification-response.mapper";
import { PUSH_TOKEN_PLATFORMS, type PushTokenPlatform } from "../domain/entities/push-token.entity";

type JwtRequestLike = { user?: { sub?: string; id?: string; user_Id?: string } };

@ApiTags("notifications")
@ApiBearerAuth("JWT-auth")
@Controller("notifications")
@UseGuards(JwtAuthGuard)
export class NotificationsController {
    constructor(
        private readonly notificationsService: NotificationsService,
        private readonly authService: AuthService
    ) {}

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

    @Post("push-tokens/register")
    @ApiOperation({
        summary: "Legacy register push token (deprecated)",
        description:
            "Backward-compatible endpoint. Prefer POST /auth/fcm-token/register for new mobile/web clients."
    })
    @ApiBody({ type: RegisterFcmTokenDto })
    @ApiOkResponse({
        description: "FCM token saved successfully",
        type: FcmTokenRegisterResponseDto
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async registerLegacyPushToken(@Req() req, @Body() body: RegisterFcmTokenDto) {
        const userId = this.getCurrentUserId(req);
        const fcmToken = this.extractFcmToken(body);
        const platform = this.normalizePlatform(body.platform, "web");
        const deviceId = await this.authService.saveFcmToken(userId, fcmToken, platform);
        return { success: true, deviceId, idDevice: deviceId, iddevice: deviceId };
    }

    @Post("push-tokens/unregister")
    @ApiOperation({
        summary: "Legacy unregister push token (deprecated)",
        description:
            "Backward-compatible endpoint. Prefer POST /auth/fcm-token/unregister for new mobile/web clients."
    })
    @ApiBody({ type: FcmTokenBodyDto })
    @ApiOkResponse({
        description: "FCM token removed successfully",
        type: LogoutResponseDto
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async unregisterLegacyPushToken(@Req() req, @Body() body: FcmTokenBodyDto) {
        const userId = this.getCurrentUserId(req);
        const fcmToken = this.extractFcmToken(body);
        await this.authService.removeFcmToken(userId, fcmToken);
        return { success: true };
    }

    private getCurrentUserId(req: JwtRequestLike) {
        const userId = req.user?.sub || req.user?.id || req.user?.user_Id;
        if (!userId) {
            throw new UnauthorizedException("Invalid access token payload");
        }
        return userId;
    }

    private extractFcmToken(body: Partial<FcmTokenBodyDto>) {
        const candidate = body.fcmToken ?? body.fcm_token ?? body.token ?? body.idDevice ?? body.iddevice;
        const token = typeof candidate === "string" ? candidate.trim() : "";
        if (!token) {
            throw new BadRequestException("fcmToken is required");
        }
        if (token.length < 20 || token.length > 4096) {
            throw new BadRequestException("fcmToken length must be between 20 and 4096");
        }
        return token;
    }

    private normalizePlatform(value: unknown, fallback: PushTokenPlatform): PushTokenPlatform {
        const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
        if (PUSH_TOKEN_PLATFORMS.includes(normalized as PushTokenPlatform)) {          
            return normalized as PushTokenPlatform;
        }
        return fallback;
    }
}
