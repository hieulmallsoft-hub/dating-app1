import { Module } from "@nestjs/common";

import { TypeOrmModule } from "@nestjs/typeorm";
import { Notification } from "./domain/entities/notification.entity";
import { PushToken } from "./domain/entities/push-token.entity";
import { NotificationsService } from "./application/notifications.service";
import { NotificationRepository } from "./infrastructure/persistence/notification.repository";
import { PushTokenRepository } from "./infrastructure/persistence/push-token.repository";
import { NotificationsController } from "./presentation/notifications.controller";
import { NotificationGateway } from "./presentation/notification.gateway";
import { AuthModule } from "../auth/auth.module";
import { FirebasePushService } from "./application/firebase-push.service";

@Module({
    imports: [TypeOrmModule.forFeature([Notification, PushToken]), AuthModule],
    controllers: [NotificationsController],
    providers: [
        NotificationsService,
        NotificationRepository,
        PushTokenRepository,
        NotificationGateway,
        FirebasePushService
    ],
    exports: [NotificationsService]
})
export class NotificationsModule {}
