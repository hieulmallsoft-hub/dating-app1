import { Body, Controller, Post, Req, UnauthorizedException, UseGuards } from "@nestjs/common";
import {
    ApiBody,
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiCreatedResponse,
    ApiNotFoundResponse,
    ApiOperation,
    ApiTags,
    ApiUnauthorizedResponse
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../../common-user/auth/infrastructure/strategies/jwt-auth-guard";
import { LocationsService } from "../application/locations.service";
import { GeofenceEventDto, GeofenceEventResponseDto } from "./dto/geofence.dto";

@ApiTags("geofence")
@ApiBearerAuth("JWT-auth")
@Controller("geofence")
@UseGuards(JwtAuthGuard)
export class GeofenceController {
    constructor(private readonly locationsService: LocationsService) {}

    @Post("event")
    @ApiOperation({
        summary: "Mobile geofence callback (ENTER/EXIT)",
        description:
            "Mobile app calls this API when OS geofence detects a transition for a saved location.\n" +
            "- ENTER: user just entered the location radius.\n" +
            "- EXIT: user just left the location radius.\n" +
            "Backend will create a notification for partner."
    })
    @ApiBody({
        type: GeofenceEventDto,
        examples: {
            enterExample: {
                summary: "User enters Home geofence",
                value: {
                    locationId: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8",
                    transition: "ENTER",
                    timestamp: 1762677600000
                }
            },
            exitExample: {
                summary: "User exits Company geofence",
                value: {
                    locationId: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8",
                    transition: "EXIT",
                    timestamp: 1762677900000
                }
            }
        }
    })
    @ApiCreatedResponse({
        description: "Geofence event processed and partner notification queued",
        type: GeofenceEventResponseDto
    })
    @ApiBadRequestResponse({
        description: "Invalid transition payload or user has no partner yet"
    })
    @ApiNotFoundResponse({
        description: "Location not found or does not belong to current couple"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async sendGeofenceEvent(@Req() req, @Body() dto: GeofenceEventDto) {
        return this.locationsService.handleGeofenceEvent(this.getCurrentUserId(req), {
            locationId: dto.locationId,
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

