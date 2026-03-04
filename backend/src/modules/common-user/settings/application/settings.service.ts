import { Injectable } from "@nestjs/common";
import { SettingRepository } from "../infrastructure/persistence/setting.repository";
import { Setting } from "../domain/entities/setting.entity";
import { UpdateSettingsDto } from "../presentation/dto/update-settings.dto";

@Injectable()
export class SettingsService {
    constructor(private readonly settingRepository: SettingRepository) {}

    async getSettings(userId: string): Promise<Setting> {
        let settings = await this.settingRepository.findOne({ where: { userId } });

        if (!settings) {
            settings = this.settingRepository.create({ userId });
            await this.settingRepository.save(settings);
        }

        return settings;
    }

    async updateSettings(userId: string, dto: UpdateSettingsDto): Promise<Setting> {
        const settings = await this.getSettings(userId);

        if (typeof dto.notificationEnabled === "boolean") {
            settings.notificationEnabled = dto.notificationEnabled;
        }

        if (dto.theme !== undefined) {
            settings.theme = dto.theme;
        }

        if (dto.privacy !== undefined) {
            settings.privacy = dto.privacy;
        }

        return this.settingRepository.save(settings);
    }
}
