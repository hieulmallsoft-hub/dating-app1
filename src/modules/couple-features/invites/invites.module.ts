import { Module } from "@nestjs/common";

import { TypeOrmModule } from "@nestjs/typeorm";
import { Invite } from "./domain/entities/invite.entity";
import { InviteService } from "./application/invite.service";
import { InviteRepository } from "./infrastructure/persistence/invite.repository";
import { NotificationsModule } from "../../common-user/notifications/notifications.module";

@Module({
    imports: [TypeOrmModule.forFeature([Invite]), NotificationsModule],
    providers: [InviteService, InviteRepository],
    exports: [InviteService]
})
export class InvitesModule {}
