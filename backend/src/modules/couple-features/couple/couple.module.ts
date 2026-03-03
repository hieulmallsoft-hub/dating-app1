import { Module } from "@nestjs/common";

import { TypeOrmModule } from "@nestjs/typeorm";
import { Couple } from "./domain/entities/couple.entity";
import { CoupleService } from "./application/couple.service";
import { CoupleRepository } from "./infrastructure/persistence/couple.repository";
import { CoupleController } from "./presentation/couple.controller";
import { InvitesModule } from "../invites/invites.module";

@Module({
    imports: [TypeOrmModule.forFeature([Couple]), InvitesModule],
    controllers: [CoupleController],
    providers: [CoupleService, CoupleRepository],
    exports: [CoupleService, CoupleRepository]
})
export class CoupleModule {}
