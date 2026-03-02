import { Module } from "@nestjs/common";

import { TypeOrmModule } from "@nestjs/typeorm";
import { Moment } from "./domain/entities/moment.entity";
import { MomentsService } from "./application/moments.service";
import { MomentRepository } from "./infrastructure/persistence/moment.repository";
import { MomentsController } from "./presentation/moments.controller";
import { CoupleModule } from "../couple/couple.module";
import { MediaModule } from "../media/media.module";

@Module({
    imports: [TypeOrmModule.forFeature([Moment]), CoupleModule, MediaModule],
    controllers: [MomentsController],
    providers: [MomentsService, MomentRepository],
    exports: [MomentsService]
})
export class MomentsModule {}
