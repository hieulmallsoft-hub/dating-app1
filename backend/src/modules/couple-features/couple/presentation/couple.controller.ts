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
import { JoinCoupleDto, UpdateCoupleDto } from "./dto/couple-ops.dto";
import { JwtAuthGuard } from "../../../common-user/auth/infrastructure/strategies/jwt-auth-guard";

@ApiTags("couple")
@ApiBearerAuth("JWT-auth")
@Controller("couple")
@UseGuards(JwtAuthGuard)
export class CoupleController {
    constructor(private readonly coupleService: CoupleService) {}

    @Get()
    @ApiOperation({
        summary: "Get current couple info",
        description: "Returns couple data and partner info for current user."
    })
    @ApiOkResponse({
        description: "Couple info returned"
    })
    @ApiNotFoundResponse({
        description: "Current user is not in a couple"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async getCouple(@Req() req) {
        return this.coupleService.getMyCoupleWithPartner(this.getCurrentUserId(req));
    }

    @Get("locations")
    @ApiOperation({
        summary: "Get couple live locations",
        description: "Returns latest location for me and partner."
    })
    @ApiOkResponse({
        description: "Location pair returned"
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
        description: "History item limit",
        example: 120
    })
    @ApiOkResponse({
        description: "Location history returned"
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

    @Post("invite")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: "Create invite code",
        description: "Creates a pending invite code for current user."
    })
    @ApiOkResponse({
        description: "Invite created"
    })
    @ApiConflictResponse({
        description: "Current user is already in a couple"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async createInvite(@Req() req) {
        return this.coupleService.createInvite(this.getCurrentUserId(req));
    }

    @Post("join")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: "Join couple with invite code",
        description: "Join an existing invite code and create couple relation."
    })
    @ApiOkResponse({
        description: "Join success"
    })
    @ApiBadRequestResponse({
        description: "Invalid invite code format, expired code, or code already used"
    })
    @ApiNotFoundResponse({
        description: "Invite code not found"
    })
    @ApiConflictResponse({
        description: "Current user already has a couple"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async joinCouple(@Req() req, @Body() joinCoupleDto: JoinCoupleDto) {
        return this.coupleService.joinCouple(this.getCurrentUserId(req), joinCoupleDto.inviteCode);
    }

    @Post("disconnect")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: "Disconnect current couple",
        description: "Disconnects current couple relation."
    })
    @ApiOkResponse({
        description: "Disconnected"
    })
    @ApiNotFoundResponse({
        description: "Current user is not in a couple"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async disconnect(@Req() req) {
        return this.coupleService.disconnect(this.getCurrentUserId(req));
    }

    @Post("connect-new")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: "Connect to new couple via invite",
        description: "Disconnect old couple (if any) then connect to new invite code."
    })
    @ApiOkResponse({
        description: "Connected to new couple"
    })
    @ApiBadRequestResponse({
        description: "Invalid/expired/used invite code"
    })
    @ApiNotFoundResponse({
        description: "Invite code not found"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async connectNew(@Req() req, @Body() joinCoupleDto: JoinCoupleDto) {
        return this.coupleService.connectNew(this.getCurrentUserId(req), joinCoupleDto.inviteCode);
    }

    @Put("start-date")
    @ApiOperation({
        summary: "Update couple start date",
        description: "Sets relationship start date."
    })
    @ApiOkResponse({
        description: "Start date updated"
    })
    @ApiBadRequestResponse({
        description: "Invalid date format"
    })
    @ApiNotFoundResponse({
        description: "Current user is not in a couple"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async setStartDate(@Req() req, @Body() updateCoupleDto: UpdateCoupleDto) {
        return this.coupleService.updateCouple(this.getCurrentUserId(req), { startDate: updateCoupleDto.startDate });
    }

    @Put("theme")
    @ApiOperation({
        summary: "Update couple theme",
        description: "Sets current couple theme."
    })
    @ApiOkResponse({
        description: "Theme updated"
    })
    @ApiNotFoundResponse({
        description: "Current user is not in a couple"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async setTheme(@Req() req, @Body() updateCoupleDto: UpdateCoupleDto) {
        return this.coupleService.updateCouple(this.getCurrentUserId(req), { theme: updateCoupleDto.theme });
    }

    private getCurrentUserId(req: { user?: { sub?: string; id?: string; user_Id?: string } }) {
        const userId = req.user?.sub || req.user?.id || req.user?.user_Id;
        if (!userId) {
            throw new UnauthorizedException("Invalid access token payload");
        }
        return userId;
    }
}



