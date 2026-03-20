import {
    Body,
    Controller,
    Get,
    Param,
    ParseUUIDPipe,
    Post,
    Query,
    Req,
    UnauthorizedException,
    UseGuards
} from "@nestjs/common";
import {
    ApiExcludeEndpoint,
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
import { TripListResponseDto, TripResponseDto, TripSyncDto, TripSyncResponseDto } from "./dto/trip.dto";
import { toTripResponse, toTripResponseList } from "./mappers/trip-response.mapper";

@ApiTags("trips")
@ApiBearerAuth("JWT-auth")
@Controller("trips")
@UseGuards(JwtAuthGuard)
export class TripsController {
    constructor(private readonly tripsService: TripsService) {}

    @Get()
    @ApiOperation({
        summary: "Get trip list",
        description: "Returns paginated trips for current user or partner in the same couple."
    })
    @ApiQuery({
        name: "userId",
        required: false,
        description: "Target userId (must be self or partner). Default is current user.",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
    })
    @ApiQuery({
        name: "page",
        required: false,
        type: Number,
        description: "Page number",
        example: 1
    })
    @ApiQuery({
        name: "limit",
        required: false,
        type: Number,
        description: "Records per page",
        example: 20
    })
    @ApiQuery({
        name: "from",
        required: false,
        type: Number,
        description:
            "Start time (epoch milliseconds, inclusive). If both from/to are omitted, backend defaults to last 30 days.",
        example: 1762677600000
    })
    @ApiQuery({
        name: "to",
        required: false,
        type: Number,
        description: "End time (epoch milliseconds, inclusive)",
        example: 1762764000000
    })
    @ApiOkResponse({
        description: "Returns trip list",
        type: TripListResponseDto
    })
    @ApiBadRequestResponse({
        description: "Invalid query params (page/limit/from/to)"
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
        @Query("limit") limit?: string,
        @Query("from") from?: string,
        @Query("to") to?: string
    ) {
        const requesterId = this.getCurrentUserId(req);
        const parsedPage = page ? Number(page) : 1;
        const parsedLimit = limit ? Number(limit) : 20;
        const targetUserId = userId || requesterId;
        const response = await this.tripsService.listTrips(
            requesterId,
            targetUserId,
            parsedPage,
            parsedLimit,
            from,
            to
        );
        return {
            data: toTripResponseList(response.data),
            page: response.page,
            limit: response.limit,
            total: response.total
        };
    }

    @Get(":id")
    @ApiOperation({
        summary: "Get trip details",
        description: "Returns one trip detail by id, including routeFull."
    })
    @ApiParam({
        name: "id",
        description: "Trip ID",
        example: "6c70bc74-61ee-4f6f-b965-2a977f4d9ab7"
    })
    @ApiOkResponse({
        description: "Returns trip detail",
        type: TripResponseDto
    })
    @ApiBadRequestResponse({
        description: "Trip id must be UUID"
    })
    @ApiNotFoundResponse({
        description: "Trip not found or does not belong to current couple"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async getTripById(@Req() req, @Param("id", new ParseUUIDPipe()) id: string) {
        const trip = await this.tripsService.getTripDetail(this.getCurrentUserId(req), id);
        return toTripResponse(trip, true);
    }

    @Get(":id/detail")
    @ApiExcludeEndpoint()
    async getTripDetailLegacy(@Req() req, @Param("id", new ParseUUIDPipe()) id: string) {
        return this.getTripById(req, id);
    }

    @Post("sync")
    @ApiOperation({
        summary: "Sync trips from mobile",
        description: "Bulk upsert trips from mobile app."
    })
    @ApiCreatedResponse({
        description: "Trips synced",
        type: TripSyncResponseDto
    })
    @ApiBadRequestResponse({
        description: "Invalid payload (for example: empty routePoints)"
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

