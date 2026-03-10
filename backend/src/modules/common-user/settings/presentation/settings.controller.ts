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
import { SettingsResponseDto } from "./dto/settings-ops.dto";

@ApiTags("settings")
@ApiBearerAuth("JWT-auth")
@Controller("settings")
@UseGuards(JwtAuthGuard)
export class SettingsController {
    constructor(private readonly settingsService: SettingsService) {}

    @Get()
    @ApiOperation({
        summary: "L?y cài d?t c?a ngu?i dùng hi?n t?i",
        description: "Tr? v? cài d?t hi?n t?i, t? t?o cài d?t m?c d?nh n?u chua có."
    })
    @ApiOkResponse({
        description: "Tr? v? cài d?t",
        type: SettingsResponseDto
    })
    @ApiUnauthorizedResponse({
        description: "Thi?u token truy c?p ho?c token không h?p l?"
    })
    async getSettings(@Req() req) {
        return this.settingsService.getSettings(this.getCurrentUserId(req));
    }

    @Put()
    @ApiOperation({
        summary: "C?p nh?t cài d?t c?a ngu?i dùng hi?n t?i",
        description: "C?p nh?t tùy ch?n thông báo, giao di?n và quy?n riêng tu."
    })
    @ApiOkResponse({
        description: "Ðã c?p nh?t cài d?t",
        type: SettingsResponseDto
    })
    @ApiBadRequestResponse({
        description: "D? li?u không h?p l? (enum ho?c ki?u d? li?u sai)"
    })
    @ApiUnauthorizedResponse({
        description: "Thi?u token truy c?p ho?c token không h?p l?"
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

