import { Module } from "@nestjs/common";

import { TypeOrmModule } from "@nestjs/typeorm";
import { Place } from "./domain/entities/place.entity";
import { PlacesService } from "./application/places.service";
import { PlaceRepository } from "./infrastructure/persistence/place.repository";
import { PlacesController } from "./presentation/places.controller";
import { GeofenceController } from "./presentation/geofence.controller";
import { PlacesGateway } from "./presentation/places.gateway";
import { CoupleModule } from "../couple/couple.module";
import { NotificationsModule } from "../../common-user/notifications/notifications.module";
import { UserModule } from "../../common-user/user/user.module";
import { AuthModule } from "../../common-user/auth/auth.module";

@Module({
    imports: [TypeOrmModule.forFeature([Place]), CoupleModule, NotificationsModule, UserModule, AuthModule],
    controllers: [PlacesController, GeofenceController],
    providers: [PlacesService, PlaceRepository, PlacesGateway],
    exports: [PlacesService]
})
export class PlacesModule {}
