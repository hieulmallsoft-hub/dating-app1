import { Module } from "@nestjs/common";

import { TypeOrmModule } from "@nestjs/typeorm";
import { Notification } from "./domain/entities/notification.entity";
import { NotificationsService } from "./application/notifications.service";
import { NotificationRepository } from "./infrastructure/persistence/notification.repository";
import { NotificationsController } from "./presentation/notifications.controller";

@Module({
    imports: [TypeOrmModule.forFeature([Notification])],
    controllers: [NotificationsController],
    providers: [NotificationsService, NotificationRepository],
    exports: [NotificationsService]
})
export class NotificationsModule {}
