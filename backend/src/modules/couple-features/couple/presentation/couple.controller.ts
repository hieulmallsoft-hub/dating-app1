import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Req,
    UseGuards,
    HttpCode,
    HttpStatus,
    UnauthorizedException,
    Query
} from "@nestjs/common";
import {
    ApiExcludeEndpoint,
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiConflictResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiQuery,
    ApiTags,
    ApiUnauthorizedResponse
} from "@nestjs/swagger";
import { CoupleService } from "../application/couple.service";
import {
    CoupleProfileResponseDto,
    CoupleLocationHistoryResponseDto,
    CoupleLocationsResponseDto,
    CoupleResponseDto,
    JoinCoupleDto,
    UpdateCoupleDto
} from "./dto/couple-ops.dto";
import { JwtAuthGuard } from "../../../common-user/auth/infrastructure/strategies/jwt-auth-guard";
import { toCoupleResponse } from "./mappers/couple-response.mapper";

@ApiTags("couple")
@ApiBearerAuth("JWT-auth")
@Controller("couple")
@UseGuards(JwtAuthGuard)
export class CoupleController {
    constructor(private readonly coupleService: CoupleService) {}

    @Get("profile")
    @ApiOperation({
        summary: "Get current couple info",
        description: "Returns partner profile, location, and couple status for current user."
    })
    @ApiOkResponse({
        description: "Returns partner profile",
        type: CoupleProfileResponseDto
    })
    @ApiNotFoundResponse({
        description: "Current user is not in a couple"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async getCoupleProfile(@Req() req) {
        return this.coupleService.getMyCoupleProfile(this.getCurrentUserId(req));
    }

    @Get()
    @ApiExcludeEndpoint()
    async getCoupleProfileLegacy(@Req() req) {
        return this.getCoupleProfile(req);
    }

    @Get("locations")
    @ApiOperation({
        summary: "Get live couple locations",
        description: "Returns latest locations of current user and partner."
    })
    @ApiOkResponse({
        description: "Returns location pair",
        type: CoupleLocationsResponseDto
    })
    @ApiNotFoundResponse({
        description: "Current user is not in a couple"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async getCoupleLocations(@Req() req) {
        return this.coupleService.getCoupleLocations(this.getCurrentUserId(req));
    }

    @Get("location-history")
    @ApiOperation({
        summary: "Get couple location history",
        description: "Returns location history of both users. limit is clamped by service."
    })
    @ApiQuery({
        name: "limit",
        required: false,
        type: Number,
        description: "Limit of history points",
        example: 120
    })
    @ApiQuery({
        name: "from",
        required: false,
        type: Number,
        description: "Start time in epoch milliseconds (inclusive)",
        example: 1762677600000
    })
    @ApiQuery({
        name: "to",
        required: false,
        type: Number,
        description: "End time in epoch milliseconds (inclusive)",
        example: 1762764000000
    })
    @ApiOkResponse({
        description: "Returns location history",
        type: CoupleLocationHistoryResponseDto
    })
    @ApiNotFoundResponse({
        description: "Current user is not in a couple"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async getCoupleLocationHistory(
        @Req() req,
        @Query("limit") limit?: string,
        @Query("from") from?: string,
        @Query("to") to?: string
    ) {
        const parsedLimit = limit ? Number(limit) : undefined;
        const parsedFrom = from ? Number(from) : undefined;
        const parsedTo = to ? Number(to) : undefined;
        return this.coupleService.getCoupleLocationHistory(
            this.getCurrentUserId(req),
            parsedLimit,
            parsedFrom,
            parsedTo
        );
    }

    @Post("join")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: "Join couple by account code",
        description: "Use partner account code to create couple connection."
    })
    @ApiOkResponse({
        description: "Couple joined successfully",
        type: CoupleProfileResponseDto
    })
    @ApiBadRequestResponse({
        description: "Account code format is invalid"
    })
    @ApiNotFoundResponse({
        description: "Account code not found"
    })
    @ApiConflictResponse({
        description: "Current user or partner is already in a couple"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async joinCouple(@Req() req, @Body() joinCoupleDto: JoinCoupleDto) {
        const userId = this.getCurrentUserId(req);
        await this.coupleService.joinCouple(userId, joinCoupleDto.inviteCode);
        return this.coupleService.getMyCoupleProfile(userId);
    }

    @Post("disconnect")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: "Disconnect current couple",
        description: "Disconnect the current couple relationship."
    })
    @ApiOkResponse({
        description: "Couple disconnected",
        type: CoupleResponseDto
    })
    @ApiNotFoundResponse({
        description: "Current user is not in a couple"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async disconnectCouple(@Req() req) {
        const couple = await this.coupleService.disconnect(this.getCurrentUserId(req));
        return toCoupleResponse(couple);
    }

    @Patch("start-date")
    @ApiOperation({
        summary: "Update relationship start date",
        description: "Set relationship start date."
    })
    @ApiOkResponse({
        description: "Start date updated",
        type: CoupleResponseDto
    })
    @ApiBadRequestResponse({
        description: "Invalid date format or missing/invalid updateTime"
    })
    @ApiConflictResponse({
        description: "Stale updateTime (newer startDate already exists)"
    })
    @ApiNotFoundResponse({
        description: "Current user is not in a couple"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async updateCoupleStartDate(@Req() req, @Body() updateCoupleDto: UpdateCoupleDto) {
        const couple = await this.coupleService.updateCouple(this.getCurrentUserId(req), {
            startDate: updateCoupleDto.startDate,
            updateTime: updateCoupleDto.updateTime
        });
        return toCoupleResponse(couple);
    }

    private getCurrentUserId(req: { user?: { sub?: string; id?: string; user_Id?: string } }) {
        const userId = req.user?.sub || req.user?.id || req.user?.user_Id;
        if (!userId) {
            throw new UnauthorizedException("Invalid access token payload");
        }
        return userId;
    }
}

