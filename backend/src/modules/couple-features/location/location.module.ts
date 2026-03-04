import { Module } from "@nestjs/common";
import { LocationService } from "./application/location.service";
import { LocationController } from "./presentation/location.controller";
import { LocationGateway } from "./presentation/location.gateway";
import { CoupleModule } from "../couple/couple.module";
import { UserModule } from "../../common-user/user/user.module";
import { AuthModule } from "../../common-user/auth/auth.module";
import { RealtimeStore } from "./infrastructure/realtime.store";

@Module({
    imports: [CoupleModule, UserModule, AuthModule],
    controllers: [LocationController],
    providers: [LocationService, LocationGateway, RealtimeStore],
    exports: [LocationService]
})
export class LocationModule {}
