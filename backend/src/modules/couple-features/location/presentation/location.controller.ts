import { Body, Controller, Get, Post, Req, UnauthorizedException, UseGuards } from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../../common-user/auth/infrastructure/strategies/jwt-auth-guard";
import { LocationService } from "../application/location.service";
import { HeartbeatDto, UpdateRealtimeLocationDto } from "./dto/location.dto";

@ApiBearerAuth("JWT-auth")
@Controller("location")
@UseGuards(JwtAuthGuard)
export class LocationController {
    constructor(private readonly locationService: LocationService) {}

    @Post("update")
    async updateLocation(@Req() req, @Body() dto: UpdateRealtimeLocationDto) {
        return this.locationService.updateLocation(this.getCurrentUserId(req), dto);
    }

    @Get("partner")
    async getPartnerLocation(@Req() req) {
        return this.locationService.getPartnerLocation(this.getCurrentUserId(req));
    }

    @Post("heartbeat")
    async heartbeat(@Req() req, @Body() dto: HeartbeatDto) {
        return this.locationService.heartbeat(this.getCurrentUserId(req), dto);
    }

    private getCurrentUserId(req: { user?: { sub?: string; id?: string; user_Id?: string } }) {
        const userId = req.user?.sub || req.user?.id || req.user?.user_Id;
        if (!userId) {
            throw new UnauthorizedException("Invalid access token payload");
        }
        return userId;
    }
}
