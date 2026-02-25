import { Module } from "@nestjs/common";

import { TypeOrmModule } from "@nestjs/typeorm";
import { Invite } from "./domain/entities/invite.entity";
import { InviteService } from "./application/invite.service";
import { InviteRepository } from "./infrastructure/persistence/invite.repository";

@Module({
    imports: [TypeOrmModule.forFeature([Invite])],
    providers: [InviteService, InviteRepository],
    exports: [InviteService]
})
export class InvitesModule {}
