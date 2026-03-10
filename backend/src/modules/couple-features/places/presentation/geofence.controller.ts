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
        summary: "G?i s? ki?n chuy?n tr?ng thái geofence",
        description: "G?i s? ki?n ENTER/EXIT c?a m?t d?a di?m t? ?ng d?ng mobile."
    })
    @ApiCreatedResponse({
        description: "Ðã x? lý s? ki?n geofence",
        type: GeofenceEventResponseDto
    })
    @ApiBadRequestResponse({
        description: "Payload transition không h?p l? ho?c ngu?i dùng chua có d?i phuong"
    })
    @ApiNotFoundResponse({
        description: "Không tìm th?y d?a di?m ho?c d?a di?m không thu?c c?p dôi hi?n t?i"
    })
    @ApiUnauthorizedResponse({
        description: "Thi?u token truy c?p ho?c token không h?p l?"
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

