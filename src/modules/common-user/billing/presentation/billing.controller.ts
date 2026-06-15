import {
    Body,
    Controller,
    ForbiddenException,
    Get,
    Headers,
    Post,
    Req,
    UnauthorizedException,
    UseGuards
} from "@nestjs/common";
import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiBody,
    ApiOkResponse,
    ApiOperation,
    ApiTags,
    ApiUnauthorizedResponse
} from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import { Public } from "src/common/decorators/customize";
import { JwtAuthGuard } from "../../auth/infrastructure/strategies/jwt-auth-guard";
import { BillingService } from "../application/billing.service";
import { GooglePlayVerifyDto } from "./dto/google-play-verify.dto";
import { SubscriptionStatusResponseDto } from "./dto/billing-ops.dto";
import { toSubscriptionStatusResponse } from "./mappers/subscription-response.mapper";

type JwtRequestLike = { user?: { sub?: string; id?: string; user_Id?: string } };

@ApiTags("billing")
@ApiBearerAuth("JWT-auth")
@Controller("billing")
@UseGuards(JwtAuthGuard)
export class BillingController {
    constructor(
        private readonly billingService: BillingService,
        private readonly configService: ConfigService
    ) {}

    @Post("google-play/verify")
    @ApiOperation({
        summary: "Verify Google Play subscription",
        description: "Verify purchase token with Google Play and update premium status."
    })
    @ApiOkResponse({
        description: "Returns subscription status",
        type: SubscriptionStatusResponseDto
    })
    @ApiBadRequestResponse({
        description: "Invalid token/product or billing is not configured"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async verifyGooglePlay(@Req() req: JwtRequestLike, @Body() dto: GooglePlayVerifyDto) {
        const userId = this.getCurrentUserId(req);
        const result = await this.billingService.verifyGooglePlaySubscription(userId, dto);
        return toSubscriptionStatusResponse(result.subscription, result.isPremium);
    }

    @Get("google-play/status")
    @ApiOperation({
        summary: "Get Google Play subscription status",
        description: "Returns latest verified subscription status for current user."
    })
    @ApiOkResponse({
        description: "Returns subscription status",
        type: SubscriptionStatusResponseDto
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async getGooglePlayStatus(@Req() req: JwtRequestLike) {
        const userId = this.getCurrentUserId(req);
        const result = await this.billingService.getGooglePlayStatus(userId);
        return toSubscriptionStatusResponse(result.subscription, result.isPremium);
    }

    @Public()
    @Post("google-play/rtdn")
    @ApiOperation({
        summary: "Receive Google Play Real-time Developer Notifications",
        description: "Google Pub/Sub push endpoint. Protect with GOOGLE_PLAY_RTDN_TOKEN in production."
    })
    @ApiBody({ description: "Google Pub/Sub push message" })
    @ApiOkResponse({ description: "Notification processed or ignored" })
    async receiveGooglePlayRtdn(
        @Body() body: unknown,
        @Headers("x-google-play-rtdn-token") token?: string
    ) {
        const expectedToken = this.configService.get<string>("billing.googlePlay.rtdnToken");
        if (expectedToken && token !== expectedToken) {
            throw new ForbiddenException("Invalid Google Play RTDN token");
        }

        const result = await this.billingService.handleGooglePlayRtdn(body);
        return { ok: true, ...result };
    }

    private getCurrentUserId(req: JwtRequestLike) {
        const userId = req.user?.sub || req.user?.id || req.user?.user_Id;
        if (!userId) {
            throw new UnauthorizedException("Invalid access token payload");
        }
        return userId;
    }
}
