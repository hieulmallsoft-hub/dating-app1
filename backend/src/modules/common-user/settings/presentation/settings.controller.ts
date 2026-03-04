import { Controller, Get, Put, Body, Req, UseGuards, UnauthorizedException } from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import { SettingsService } from "../application/settings.service";
import { JwtAuthGuard } from "../../auth/infrastructure/strategies/jwt-auth-guard";
import { UpdateSettingsDto } from "./dto/update-settings.dto";

@ApiBearerAuth("JWT-auth")
@Controller("settings")
@UseGuards(JwtAuthGuard)
export class SettingsController {
    constructor(private readonly settingsService: SettingsService) {}

    @Get()
    async getSettings(@Req() req) {
        return this.settingsService.getSettings(this.getCurrentUserId(req));
    }

    @Put()
    async updateSettings(@Req() req, @Body() dto: UpdateSettingsDto) {
        return this.settingsService.updateSettings(this.getCurrentUserId(req), dto);
    }

    private getCurrentUserId(req: { user?: { sub?: string; id?: string; user_Id?: string } }) {
        const userId = req.user?.sub || req.user?.id || req.user?.user_Id;
        if (!userId) {
            throw new UnauthorizedException("Invalid access token payload");
        }
        return userId;
    }
}
