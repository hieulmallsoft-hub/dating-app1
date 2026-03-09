import { Controller, Get, Put, Body, Req, UseGuards, UnauthorizedException } from "@nestjs/common";
import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiOkResponse,
    ApiOperation,
    ApiTags,
    ApiUnauthorizedResponse
} from "@nestjs/swagger";
import { SettingsService } from "../application/settings.service";
import { JwtAuthGuard } from "../../auth/infrastructure/strategies/jwt-auth-guard";
import { UpdateSettingsDto } from "./dto/update-settings.dto";

@ApiTags("settings")
@ApiBearerAuth("JWT-auth")
@Controller("settings")
@UseGuards(JwtAuthGuard)
export class SettingsController {
    constructor(private readonly settingsService: SettingsService) {}

    @Get()
    @ApiOperation({
        summary: "Get current user settings",
        description: "Returns current settings, auto-creates default settings if missing."
    })
    @ApiOkResponse({
        description: "Settings returned"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async getSettings(@Req() req) {
        return this.settingsService.getSettings(this.getCurrentUserId(req));
    }

    @Put()
    @ApiOperation({
        summary: "Update current user settings",
        description: "Update notification, theme, and privacy options."
    })
    @ApiOkResponse({
        description: "Settings updated"
    })
    @ApiBadRequestResponse({
        description: "Validation failed (invalid enum or type)"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
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
