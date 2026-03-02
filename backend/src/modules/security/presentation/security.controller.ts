import { Controller, Post, Body, Req, UseGuards, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import { SecurityService } from "../application/security.service";
import { JwtAuthGuard } from "../../auth/infrastructure/strategies/jwt-auth-guard";

@ApiBearerAuth("JWT-auth")
@Controller("security")
@UseGuards(JwtAuthGuard)
export class SecurityController {
    constructor(private readonly securityService: SecurityService) {}

    @Post("pin")
    @HttpCode(HttpStatus.OK)
    async setPin(@Req() req, @Body("pin") pin: string) {
        return this.securityService.setPin(req.user.sub, pin);
    }

    @Post("verify-pin")
    @HttpCode(HttpStatus.OK)
    async verifyPin(@Req() req, @Body("pin") pin: string) {
        return this.securityService.verifyPin(req.user.sub, pin);
    }
}
