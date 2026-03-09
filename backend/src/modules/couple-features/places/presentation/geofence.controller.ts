import { Body, Controller, Post, Req, UnauthorizedException, UseGuards } from "@nestjs/common";
import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiCreatedResponse,
    ApiNotFoundResponse,
    ApiOperation,
    ApiTags,
    ApiUnauthorizedResponse
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../../common-user/auth/infrastructure/strategies/jwt-auth-guard";
import { PlacesService } from "../application/places.service";
import { GeofenceEventDto, GeofenceEventResponseDto } from "./dto/geofence.dto";

@ApiTags("geofence")
@ApiBearerAuth("JWT-auth")
@Controller("geofence")
@UseGuards(JwtAuthGuard)
export class GeofenceController {
    constructor(private readonly placesService: PlacesService) {}

    @Post("event")
    @ApiOperation({
        summary: "Submit geofence transition event",
        description: "Sends ENTER/EXIT event of a place from mobile client."
    })
    @ApiCreatedResponse({
        description: "Geofence event processed",
        type: GeofenceEventResponseDto
    })
    @ApiBadRequestResponse({
        description: "Invalid transition payload or user has no partner"
    })
    @ApiNotFoundResponse({
        description: "Place not found or not in current couple"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
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
