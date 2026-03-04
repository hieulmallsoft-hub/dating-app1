import { Body, Controller, Post, Req, UnauthorizedException, UseGuards } from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../../common-user/auth/infrastructure/strategies/jwt-auth-guard";
import { PlacesService } from "../application/places.service";
import { GeofenceEventDto } from "./dto/geofence.dto";

@ApiBearerAuth("JWT-auth")
@Controller("geofence")
@UseGuards(JwtAuthGuard)
export class GeofenceController {
    constructor(private readonly placesService: PlacesService) {}

    @Post("event")
    async handleEvent(@Req() req, @Body() dto: GeofenceEventDto) {
        return this.placesService.handleGeofenceEvent(this.getCurrentUserId(req), {
            placeId: dto.placeId,
            transition: dto.transition,
            timestamp: dto.timestamp
        });
    }

    private getCurrentUserId(req: { user?: { sub?: string; id?: string; user_Id?: string } }) {
        const userId = req.user?.sub || req.user?.id || req.user?.user_Id;
        if (!userId) {
            throw new UnauthorizedException("Invalid access token payload");
        }
        return userId;
    }
}
