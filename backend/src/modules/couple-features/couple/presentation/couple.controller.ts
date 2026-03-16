import {
    Controller,
    Get,
    Post,
    Put,
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
    async getCoupleLocationHistory(@Req() req, @Query("limit") limit?: string) {
        const parsedLimit = limit ? Number(limit) : undefined;
        return this.coupleService.getCoupleLocationHistory(this.getCurrentUserId(req), parsedLimit);
    }

    @Post("join")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: "Join couple by account code",
        description: "Use partner account code to create couple connection."
    })
    @ApiOkResponse({
        description: "Couple joined successfully",
        type: CoupleResponseDto
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
        const couple = await this.coupleService.joinCouple(this.getCurrentUserId(req), joinCoupleDto.inviteCode);
        return toCoupleResponse(couple);
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

    @Put("start-date")
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




