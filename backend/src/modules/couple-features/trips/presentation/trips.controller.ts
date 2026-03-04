import { Body, Controller, Get, Param, Post, Query, Req, UnauthorizedException, UseGuards } from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../../common-user/auth/infrastructure/strategies/jwt-auth-guard";
import { TripsService } from "../application/trips.service";
import { TripSyncDto } from "./dto/trip.dto";

@ApiBearerAuth("JWT-auth")
@Controller("trips")
@UseGuards(JwtAuthGuard)
export class TripsController {
    constructor(private readonly tripsService: TripsService) {}

    @Get()
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
    async getTripDetail(@Req() req, @Param("id") id: string) {
        return this.tripsService.getTripDetail(this.getCurrentUserId(req), id);
    }

    @Post("sync")
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
