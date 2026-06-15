import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Trip } from "./domain/entities/trip.entity";
import { TripRepository } from "./infrastructure/persistence/trip.repository";
import { TripsService } from "./application/trips.service";
import { TripsController } from "./presentation/trips.controller";
import { CoupleModule } from "../couple/couple.module";
import { NotificationsModule } from "../../common-user/notifications/notifications.module";

@Module({
    imports: [TypeOrmModule.forFeature([Trip]), CoupleModule, NotificationsModule],
    controllers: [TripsController],
    providers: [TripsService, TripRepository],
    exports: [TripsService]
})
export class TripsModule {}
