import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    Put,
    Req,
    UnauthorizedException,
    UseGuards
} from "@nestjs/common";
import {
    ApiBadRequestResponse,
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
import { CreateTestNotificationDto, NotificationResponseDto } from "./dto/notification-ops.dto";
import {
    toNotificationResponse,
    toNotificationResponseList
} from "./mappers/notification-response.mapper";
import { NotificationType } from "../domain/entities/notification.entity";

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

    @Post("test")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: "Create test notification",
        description:
            "Create a notification manually for testing. It goes through DB save, realtime socket emit, and push send."
    })
    @ApiBody({
        type: CreateTestNotificationDto,
        examples: {
            self: {
                summary: "Send to current user",
                value: {
                    title: "Test thong bao",
                    content: "Backend test tu Swagger",
                    type: NotificationType.TEST
                }
            },
            partner: {
                summary: "Send to partner by user id",
                value: {
                    targetUserId: "4f8cc6d9-ccf3-4e1e-ae3d-0f23db4be0d7",
                    title: "Tin nhan moi",
                    content: "Demo push/socket",
                    type: NotificationType.CHAT
                }
            }
        }
    })
    @ApiOkResponse({
        description: "Notification created and dispatched",
        type: NotificationResponseDto
    })
    @ApiBadRequestResponse({
        description: "Invalid request body"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async createTestNotification(@Req() req: JwtRequestLike, @Body() body: CreateTestNotificationDto) {
        const actorId = this.getCurrentUserId(req);
        const targetUserId = body.targetUserId?.trim() || actorId;
        const created = await this.notificationsService.createNotification(
            targetUserId,
            body.title,
            body.content,
            body.type
        );
        return toNotificationResponse(created);
    }

    private getCurrentUserId(req: JwtRequestLike) {
        const userId = req.user?.sub || req.user?.id || req.user?.user_Id;
        if (!userId) {
            throw new UnauthorizedException("Invalid access token payload");
        }
        return userId;
    }
}
