import { Module } from "@nestjs/common";

import { TypeOrmModule } from "@nestjs/typeorm";
import { SecuritySetting } from "./domain/entities/security.entity";
import { SecurityService } from "./application/security.service";
import { SecurityRepository } from "./infrastructure/persistence/security.repository";
import { SecurityController } from "./presentation/security.controller";

@Module({
    imports: [TypeOrmModule.forFeature([SecuritySetting])],
    controllers: [SecurityController],
    providers: [SecurityService, SecurityRepository],
    exports: [SecurityService]
})
export class SecurityModule {}
