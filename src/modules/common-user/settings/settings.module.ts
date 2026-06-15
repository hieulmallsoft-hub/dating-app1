import { Module } from "@nestjs/common";

import { TypeOrmModule } from "@nestjs/typeorm";
import { Setting } from "./domain/entities/setting.entity";
import { SettingsService } from "./application/settings.service";
import { SettingRepository } from "./infrastructure/persistence/setting.repository";
import { SettingsController } from "./presentation/settings.controller";

@Module({
    imports: [TypeOrmModule.forFeature([Setting])],
    controllers: [SettingsController],
    providers: [SettingsService, SettingRepository],
    exports: [SettingsService]
})
export class SettingsModule {}
