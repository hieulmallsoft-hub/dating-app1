import { Module } from "@nestjs/common";

import { TypeOrmModule } from "@nestjs/typeorm";
import { Notification } from "./domain/entities/notification.entity";
import { NotificationsService } from "./application/notifications.service";
import { NotificationRepository } from "./infrastructure/persistence/notification.repository";
import { NotificationsController } from "./presentation/notifications.controller";
import { NotificationGateway } from "./presentation/notification.gateway";
import { AuthModule } from "../auth/auth.module";

@Module({
    imports: [TypeOrmModule.forFeature([Notification]), AuthModule],
    controllers: [NotificationsController],
    providers: [NotificationsService, NotificationRepository, NotificationGateway],
    exports: [NotificationsService]
})
export class NotificationsModule {}
