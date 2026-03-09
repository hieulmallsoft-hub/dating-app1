import { Module } from "@nestjs/common";

import { TypeOrmModule } from "@nestjs/typeorm";
import { Media } from "./domain/entities/media.entity";
import { MediaService } from "./application/media.service";
import { MediaRepository } from "./infrastructure/persistence/media.repository";
import { MediaController } from "./presentation/media.controller";
import { CoupleModule } from "../couple/couple.module";
import { MediaRealtimeService } from "./application/media-realtime.service";
import { MediaGateway } from "./presentation/media.gateway";
import { AuthModule } from "../../common-user/auth/auth.module";
import { NotificationsModule } from "../../common-user/notifications/notifications.module";

@Module({
    imports: [TypeOrmModule.forFeature([Media]), CoupleModule, AuthModule, NotificationsModule],
    controllers: [MediaController],
    providers: [MediaService, MediaRepository, MediaRealtimeService, MediaGateway],
    exports: [MediaService]
})
export class MediaModule {}


