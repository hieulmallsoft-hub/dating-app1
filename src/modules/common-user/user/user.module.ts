import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "./domain/entities/user.entity";
import { LocationHistory } from "./domain/entities/location-history.entity";
import { ProfileController } from "./presentation/profile.controller";
import { LocationGateway } from "./presentation/location.gateway";
import { LOCATION_GATEWAY_TOKEN } from "./presentation/location.gateway.token";
import { UsersService } from "./application/user.service";
import { LocationPresenceService } from "./application/location-presence.service";
import { LocationRateLimitService } from "./application/location-rate-limit.service";
import { LocationHistoryRetentionService } from "./application/location-history-retention.service";
import { UserRepository } from "./infrastructure/persistence/user.repository";
import { LocationHistoryRepository } from "./infrastructure/persistence/location-history.repository";
import { UploadsModule } from "../uploads/uploads.module";
import { CoupleModule } from "../../couple-features/couple/couple.module";
import { AuthModule } from "../auth/auth.module";
import { RedisModule } from "../../../common/redis/redis.module";
import { Setting } from "../settings/domain/entities/setting.entity";
import { SecuritySetting } from "../security/domain/entities/security.entity";

@Module({
    imports: [
        TypeOrmModule.forFeature([User, LocationHistory, Setting, SecuritySetting]),
        RedisModule,
        UploadsModule,
        CoupleModule,
        forwardRef(() => AuthModule)
    ],
    controllers: [ProfileController],
    providers: [
        UsersService,
        UserRepository,
        LocationHistoryRepository,
        LocationGateway,
        LocationPresenceService,
        LocationRateLimitService,
        LocationHistoryRetentionService,
        { provide: LOCATION_GATEWAY_TOKEN, useExisting: LocationGateway }
    ],
    exports: [UsersService, UserRepository, LocationHistoryRepository, LocationPresenceService, LocationRateLimitService]
})
export class UserModule {}
