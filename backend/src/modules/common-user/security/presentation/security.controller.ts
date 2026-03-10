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
import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiBody,
    ApiOkResponse,
    ApiOperation,
    ApiTags,
    ApiUnauthorizedResponse
} from "@nestjs/swagger";
import { SecurityService } from "../application/security.service";
import { JwtAuthGuard } from "../../auth/infrastructure/strategies/jwt-auth-guard";
import { PinBodyDto, SetPinResponseDto, VerifyPinResponseDto } from "./dto/security-ops.dto";

@ApiTags("security")
@ApiBearerAuth("JWT-auth")
@Controller("security")
@UseGuards(JwtAuthGuard)
export class SecurityController {
    constructor(private readonly securityService: SecurityService) {}

    @Post("pin")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: "Thi?t l?p PIN b?o m?t",
        description: "Thi?t l?p ho?c c?p nh?t PIN 4 ch? s? cho ngu?i dùng hi?n t?i."
    })
    @ApiBody({
        type: PinBodyDto
    })
    @ApiOkResponse({
        description: "Thi?t l?p PIN thành công",
        type: SetPinResponseDto
    })
    @ApiBadRequestResponse({
        description: "Ð?nh d?ng PIN không h?p l? (ph?i g?m 4 ch? s?)"
    })
    @ApiUnauthorizedResponse({
        description: "Thi?u token truy c?p ho?c token không h?p l?"
    })
    async setPin(@Req() req, @Body() dto: PinBodyDto) {
        const security = await this.securityService.setPin(this.getCurrentUserId(req), dto.pin);
        return {
            id: security.id,
            userId: security.userId,
            updatedAt: security.updatedAt
        };
    }

    @Post("verify-pin")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: "Xác th?c PIN b?o m?t",
        description: "Xác th?c mã PIN ngu?i dùng v?a nh?p."
    })
    @ApiBody({
        type: PinBodyDto
    })
    @ApiOkResponse({
        description: "Xác th?c PIN thành công",
        type: VerifyPinResponseDto
    })
    @ApiBadRequestResponse({
        description: "Chua thi?t l?p PIN ho?c PIN không kh?p"
    })
    @ApiUnauthorizedResponse({
        description: "Thi?u token truy c?p ho?c token không h?p l?"
    })
    async verifyPin(@Req() req, @Body() dto: PinBodyDto) {
        return this.securityService.verifyPin(this.getCurrentUserId(req), dto.pin);
    }

    private getCurrentUserId(req: { user?: { sub?: string; id?: string; user_Id?: string } }) {
        const userId = req.user?.sub || req.user?.id || req.user?.user_Id;
        if (!userId) {
            throw new UnauthorizedException("Invalid access token payload");
        }
        return userId;
    }
}

