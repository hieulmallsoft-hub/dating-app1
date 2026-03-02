import { Module } from "@nestjs/common";

import { TypeOrmModule } from "@nestjs/typeorm";
import { Media } from "./domain/entities/media.entity";
import { MediaService } from "./application/media.service";
import { MediaRepository } from "./infrastructure/persistence/media.repository";
import { MediaController } from "./presentation/media.controller";
import { CoupleModule } from "../couple/couple.module";

@Module({
    imports: [TypeOrmModule.forFeature([Media]), CoupleModule],
    controllers: [MediaController],
    providers: [MediaService, MediaRepository],
    exports: [MediaService]
})
export class MediaModule {}
