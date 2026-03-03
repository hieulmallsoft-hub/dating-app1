import { Module } from "@nestjs/common";

import { TypeOrmModule } from "@nestjs/typeorm";
import { Place } from "./domain/entities/place.entity";
import { PlacesService } from "./application/places.service";
import { PlaceRepository } from "./infrastructure/persistence/place.repository";
import { PlacesController } from "./presentation/places.controller";
import { CoupleModule } from "../couple/couple.module";

@Module({
    imports: [TypeOrmModule.forFeature([Place]), CoupleModule],
    controllers: [PlacesController],
    providers: [PlacesService, PlaceRepository],
    exports: [PlacesService]
})
export class PlacesModule {}
