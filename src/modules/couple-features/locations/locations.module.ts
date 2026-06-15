import { Module } from "@nestjs/common";

import { TypeOrmModule } from "@nestjs/typeorm";
import { Location } from "./domain/entities/location.entity";
import { LocationsService } from "./application/locations.service";
import { LocationRepository } from "./infrastructure/persistence/location.repository";
import { LocationsController } from "./presentation/locations.controller";
import { GeofenceController } from "./presentation/geofence.controller";
import { LocationsGateway } from "./presentation/locations.gateway";
import { CoupleModule } from "../couple/couple.module";
import { NotificationsModule } from "../../common-user/notifications/notifications.module";
import { UserModule } from "../../common-user/user/user.module";
import { AuthModule } from "../../common-user/auth/auth.module";

@Module({
    imports: [TypeOrmModule.forFeature([Location]), CoupleModule, NotificationsModule, UserModule, AuthModule],
    controllers: [LocationsController, GeofenceController],
    providers: [LocationsService, LocationRepository, LocationsGateway],
    exports: [LocationsService]
})
export class LocationsModule {}
