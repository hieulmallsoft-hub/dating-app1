import { Controller, Get, Put, Body, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { SettingsService } from '../application/settings.service';
import { JwtAuthGuard } from '../../auth/infrastructure/strategies/jwt-auth-guard';

@ApiBearerAuth('JWT-auth')
@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  async getSettings(@Req() req) {
    return this.settingsService.getSettings(req.user.sub);
  }

  @Put()
  async updateSettings(@Req() req, @Body() dto: any) {
    return this.settingsService.updateSettings(req.user.sub, dto);
  }
}
