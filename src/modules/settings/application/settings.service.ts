import { Injectable } from '@nestjs/common';
import { SettingRepository } from '../infrastructure/persistence/setting.repository';
import { Setting } from '../domain/entities/setting.entity';

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

  async updateSettings(userId: string, dto: any): Promise<Setting> {
    const settings = await this.getSettings(userId);
    Object.assign(settings, dto);
    return this.settingRepository.save(settings);
  }
}
