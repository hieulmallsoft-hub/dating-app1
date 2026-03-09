import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "./domain/entities/user.entity";
import { LocationHistory } from "./domain/entities/location-history.entity";
import { UsersController } from "./presentation/users.controller";
import { UsersService } from "./application/user.service";
import { UserRepository } from "./infrastructure/persistence/user.repository";
import { LocationHistoryRepository } from "./infrastructure/persistence/location-history.repository";
import { UploadsModule } from "../uploads/uploads.module";

@Module({
    imports: [TypeOrmModule.forFeature([User, LocationHistory]), UploadsModule],
    controllers: [UsersController],
    providers: [UsersService, UserRepository, LocationHistoryRepository],
    exports: [UsersService, UserRepository, LocationHistoryRepository]
})
export class UserModule {}
