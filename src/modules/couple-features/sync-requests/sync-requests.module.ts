import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SyncRequest } from "./domain/entities/sync-request.entity";
import { SyncRequestRepository } from "./infrastructure/persistence/sync-request.repository";
import { SyncRequestsService } from "./application/sync-requests.service";
import { SyncRequestsController } from "./presentation/sync-requests.controller";
import { CoupleModule } from "../couple/couple.module";
import { NotificationsModule } from "../../common-user/notifications/notifications.module";

@Module({
    imports: [TypeOrmModule.forFeature([SyncRequest]), CoupleModule, NotificationsModule],
    controllers: [SyncRequestsController],
    providers: [SyncRequestsService, SyncRequestRepository],
    exports: [SyncRequestsService]
})
export class SyncRequestsModule {}
