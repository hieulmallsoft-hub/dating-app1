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
import { TripListResponseDto, TripResponseDto, TripSyncDto, TripSyncResponseDto } from "./dto/trip.dto";

@ApiTags("trips")
@ApiBearerAuth("JWT-auth")
@Controller("trips")
@UseGuards(JwtAuthGuard)
export class TripsController {
    constructor(private readonly tripsService: TripsService) {}

    @Get()
    @ApiOperation({
        summary: "L?y danh sách chuy?n di",
        description: "Tr? v? danh sách chuy?n di có phân trang cho ngu?i dùng hi?n t?i ho?c d?i phuong trong cùng c?p dôi."
    })
    @ApiQuery({
        name: "userId",
        required: false,
        description: "userId m?c tiêu (ph?i là tôi ho?c d?i phuong). M?c d?nh là ngu?i dùng hi?n t?i.",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
    })
    @ApiQuery({
        name: "page",
        required: false,
        type: Number,
        description: "S? trang",
        example: 1
    })
    @ApiQuery({
        name: "limit",
        required: false,
        type: Number,
        description: "S? b?n ghi m?i trang",
        example: 20
    })
    @ApiOkResponse({
        description: "Ðã tr? v? danh sách chuy?n di",
        type: TripListResponseDto
    })
    @ApiNotFoundResponse({
        description: "userId yêu c?u không thu?c c?p dôi hi?n t?i"
    })
    @ApiUnauthorizedResponse({
        description: "Thi?u token truy c?p ho?c token không h?p l?"
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
        summary: "L?y chi ti?t chuy?n di",
        description: "Tr? v? chi ti?t m?t chuy?n di theo id, bao g?m routeFull."
    })
    @ApiParam({
        name: "id",
        description: "ID chuy?n di",
        example: "trip_20260309_001"
    })
    @ApiOkResponse({
        description: "Ðã tr? v? chi ti?t chuy?n di",
        type: TripResponseDto
    })
    @ApiNotFoundResponse({
        description: "Không tìm th?y chuy?n di ho?c chuy?n di không thu?c c?p dôi hi?n t?i"
    })
    @ApiUnauthorizedResponse({
        description: "Thi?u token truy c?p ho?c token không h?p l?"
    })
    async getTripDetail(@Req() req, @Param("id") id: string) {
        return this.tripsService.getTripDetail(this.getCurrentUserId(req), id);
    }

    @Post("sync")
    @ApiOperation({
        summary: "Ð?ng b? chuy?n di t? mobile",
        description: "Upsert hàng lo?t chuy?n di t? ?ng d?ng mobile."
    })
    @ApiCreatedResponse({
        description: "Ðã d?ng b? chuy?n di",
        type: TripSyncResponseDto
    })
    @ApiBadRequestResponse({
        description: "Payload không h?p l? (ví d?: routePoints r?ng)"
    })
    @ApiUnauthorizedResponse({
        description: "Thi?u token truy c?p ho?c token không h?p l?"
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

