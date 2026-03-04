import {
    Controller,
    Post,
    Body,
    Req,
    UseGuards,
    HttpCode,
    HttpStatus,
    UnauthorizedException
} from "@nestjs/common";
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
        return this.securityService.setPin(this.getCurrentUserId(req), pin);
    }

    @Post("verify-pin")
    @HttpCode(HttpStatus.OK)
    async verifyPin(@Req() req, @Body("pin") pin: string) {
        return this.securityService.verifyPin(this.getCurrentUserId(req), pin);
    }

    private getCurrentUserId(req: { user?: { sub?: string; id?: string; user_Id?: string } }) {
        const userId = req.user?.sub || req.user?.id || req.user?.user_Id;
        if (!userId) {
            throw new UnauthorizedException("Invalid access token payload");
        }
        return userId;
    }
}
