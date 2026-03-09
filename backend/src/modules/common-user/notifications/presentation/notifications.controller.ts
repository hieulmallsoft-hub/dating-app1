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

@ApiTags("notifications")
@ApiBearerAuth("JWT-auth")
@Controller("notifications")
@UseGuards(JwtAuthGuard)
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) {}

    @Get()
    @ApiOperation({
        summary: "Get notifications",
        description: "Returns notifications of current user."
    })
    @ApiOkResponse({
        description: "Notifications returned"
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
        description: "Marks one notification as read for current user."
    })
    @ApiParam({
        name: "id",
        description: "Notification id",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
    })
    @ApiOkResponse({
        description: "Notification updated"
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
        description: "Creates a test notification for current user. title/content/type are optional."
    })
    @ApiBody({
        required: false,
        schema: {
            type: "object",
            properties: {
                title: { type: "string", example: "Test notification" },
                content: { type: "string", example: "Created from Swagger" },
                type: { type: "string", example: "test" }
            }
        }
    })
    @ApiOkResponse({
        description: "Test notification created"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async createTestNotification(
        @Req() req,
        @Body("title") title?: string,
        @Body("content") content?: string,
        @Body("type") type?: string
    ) {
        const userId = this.getCurrentUserId(req);
        const fallbackTitle = "Test notification";
        const fallbackContent = `Created at ${new Date().toISOString()}`;
        return this.notificationsService.createNotification(
            userId,
            title?.trim() || fallbackTitle,
            content?.trim() || fallbackContent,
            type?.trim() || "test"
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
