import { Controller, Get, Put, Req, UseGuards, Param } from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import { NotificationsService } from "../application/notifications.service";
import { JwtAuthGuard } from "../../auth/infrastructure/strategies/jwt-auth-guard";

@ApiBearerAuth("JWT-auth")
@Controller("notifications")
@UseGuards(JwtAuthGuard)
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) {}

    @Get()
    async getNotifications(@Req() req) {
        return this.notificationsService.getNotifications(req.user.sub);
    }

    @Put(":id/read")
    async markAsRead(@Req() req, @Param("id") id: string) {
        return this.notificationsService.markAsRead(id, req.user.sub);
    }
}
