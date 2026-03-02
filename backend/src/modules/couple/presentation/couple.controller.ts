import { Controller, Get, Post, Put, Body, Req, UseGuards, HttpCode, HttpStatus, UnauthorizedException } from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import { CoupleService } from "../application/couple.service";
import { JoinCoupleDto, UpdateCoupleDto } from "./dto/couple-ops.dto";
import { JwtAuthGuard } from "../../auth/infrastructure/strategies/jwt-auth-guard";

@ApiBearerAuth("JWT-auth")
@Controller("couple")
@UseGuards(JwtAuthGuard)
export class CoupleController {
    constructor(private readonly coupleService: CoupleService) {}

    @Get()
    async getCouple(@Req() req) {
        return this.coupleService.getMyCoupleWithPartner(this.getCurrentUserId(req));
    }

    @Post("invite")
    @HttpCode(HttpStatus.OK)
    async createInvite(@Req() req) {
        return this.coupleService.createInvite(this.getCurrentUserId(req));
    }

    @Post("join")
    @HttpCode(HttpStatus.OK)
    async joinCouple(@Req() req, @Body() joinCoupleDto: JoinCoupleDto) {
        return this.coupleService.joinCouple(this.getCurrentUserId(req), joinCoupleDto.inviteCode);
    }

    @Post("disconnect")
    @HttpCode(HttpStatus.OK)
    async disconnect(@Req() req) {
        return this.coupleService.disconnect(this.getCurrentUserId(req));
    }

    @Post("connect-new")
    @HttpCode(HttpStatus.OK)
    async connectNew(@Req() req, @Body() joinCoupleDto: JoinCoupleDto) {
        return this.coupleService.connectNew(this.getCurrentUserId(req), joinCoupleDto.inviteCode);
    }

    @Put("start-date")
    async setStartDate(@Req() req, @Body() updateCoupleDto: UpdateCoupleDto) {
        return this.coupleService.updateCouple(this.getCurrentUserId(req), { startDate: updateCoupleDto.startDate });
    }

    @Put("theme")
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
