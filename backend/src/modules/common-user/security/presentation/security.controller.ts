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
        summary: "Set security PIN",
        description: "Set or update 4-digit PIN for current user."
    })
    @ApiBody({
        type: PinBodyDto
    })
    @ApiOkResponse({
        description: "PIN set successfully",
        type: SetPinResponseDto
    })
    @ApiBadRequestResponse({
        description: "PIN invalid format (must be 4 digits)"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
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
        summary: "Verify security PIN",
        description: "Validate entered PIN of current user."
    })
    @ApiBody({
        type: PinBodyDto
    })
    @ApiOkResponse({
        description: "PIN verified",
        type: VerifyPinResponseDto
    })
    @ApiBadRequestResponse({
        description: "PIN not set or PIN mismatch"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
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
