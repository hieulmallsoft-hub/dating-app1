import { Module } from "@nestjs/common";

import { TypeOrmModule } from "@nestjs/typeorm";
import { Moment } from "./domain/entities/moment.entity";
import { MomentsService } from "./application/moments.service";
import { MomentRepository } from "./infrastructure/persistence/moment.repository";
import { MomentsController } from "./presentation/moments.controller";
import { CoupleModule } from "../couple/couple.module";
import { MediaModule } from "../media/media.module";
import { NotificationsModule } from "../../common-user/notifications/notifications.module";
import { UploadsModule } from "../../common-user/uploads/uploads.module";

@Module({
    imports: [TypeOrmModule.forFeature([Moment]), CoupleModule, MediaModule, NotificationsModule, UploadsModule],
    controllers: [MomentsController],
    providers: [MomentsService, MomentRepository],
    exports: [MomentsService]
})
export class MomentsModule {}
