import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "./domain/entities/users\.model";
import { UsersController } from "./presentation/users.controller";
import { UsersService } from "./application/user.service";
import { UserRepository } from "./infrastructure/persistence/user.repository";

@Module({
    imports: [TypeOrmModule.forFeature([User])],
    controllers: [UsersController],
    providers: [UsersService, UserRepository],
    exports: [UsersService, UserRepository]
})
export class UserModule {}
