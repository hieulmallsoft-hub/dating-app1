import { Body, Controller, Get, Param, Post, Query, Req, UnauthorizedException, UseGuards } from "@nestjs/common";
import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiCreatedResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiTags,
    ApiUnauthorizedResponse
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../../common-user/auth/infrastructure/strategies/jwt-auth-guard";
import { TripsService } from "../application/trips.service";
import { TripSyncDto } from "./dto/trip.dto";

@ApiTags("trips")
@ApiBearerAuth("JWT-auth")
@Controller("trips")
@UseGuards(JwtAuthGuard)
export class TripsController {
    constructor(private readonly tripsService: TripsService) {}

    @Get()
    @ApiOperation({
        summary: "List trips",
        description: "Returns paginated trips for current user or partner in same couple."
    })
    @ApiQuery({
        name: "userId",
        required: false,
        description: "Target user id (must be me or partner). Default is current user.",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
    })
    @ApiQuery({
        name: "page",
        required: false,
        description: "Page number",
        example: 1
    })
    @ApiQuery({
        name: "limit",
        required: false,
        description: "Items per page",
        example: 20
    })
    @ApiOkResponse({
        description: "Trips list returned"
    })
    @ApiNotFoundResponse({
        description: "Requested userId is not in current couple"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async listTrips(
        @Req() req,
        @Query("userId") userId?: string,
        @Query("page") page?: string,
        @Query("limit") limit?: string
    ) {
        const requesterId = this.getCurrentUserId(req);
        const parsedPage = page ? Number(page) : 1;
        const parsedLimit = limit ? Number(limit) : 20;
        const targetUserId = userId || requesterId;

        return this.tripsService.listTrips(requesterId, targetUserId, parsedPage, parsedLimit);
    }

    @Get(":id/detail")
    @ApiOperation({
        summary: "Get trip detail",
        description: "Returns one trip detail by id including routeFull."
    })
    @ApiParam({
        name: "id",
        description: "Trip id",
        example: "trip_20260309_001"
    })
    @ApiOkResponse({
        description: "Trip detail returned"
    })
    @ApiNotFoundResponse({
        description: "Trip not found or not in current couple"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async getTripDetail(@Req() req, @Param("id") id: string) {
        return this.tripsService.getTripDetail(this.getCurrentUserId(req), id);
    }

    @Post("sync")
    @ApiOperation({
        summary: "Sync trips from mobile",
        description: "Bulk upserts trips from mobile client."
    })
    @ApiCreatedResponse({
        description: "Trips synced",
        schema: {
            type: "object",
            properties: {
                success: { type: "boolean", example: true },
                count: { type: "number", example: 2 }
            }
        }
    })
    @ApiBadRequestResponse({
        description: "Invalid payload (e.g., routePoints empty)"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async syncTrips(@Req() req, @Body() dto: TripSyncDto) {
        return this.tripsService.syncTrips(this.getCurrentUserId(req), dto);
    }

    private getCurrentUserId(req: { user?: { sub?: string; id?: string; user_Id?: string } }) {
        const userId = req.user?.sub || req.user?.id || req.user?.user_Id;
        if (!userId) {
            throw new UnauthorizedException("Invalid access token payload");
        }
        return userId;
    }
}
