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
        schema: {
            type: "object",
            properties: {
                pin: { type: "string", example: "1234", description: "Exactly 4 digits" }
            },
            required: ["pin"]
        }
    })
    @ApiOkResponse({
        description: "PIN set successfully"
    })
    @ApiBadRequestResponse({
        description: "PIN invalid format (must be 4 digits)"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async setPin(@Req() req, @Body("pin") pin: string) {
        return this.securityService.setPin(this.getCurrentUserId(req), pin);
    }

    @Post("verify-pin")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: "Verify security PIN",
        description: "Validate entered PIN of current user."
    })
    @ApiBody({
        schema: {
            type: "object",
            properties: {
                pin: { type: "string", example: "1234" }
            },
            required: ["pin"]
        }
    })
    @ApiOkResponse({
        description: "PIN verified",
        schema: { type: "object", properties: { success: { type: "boolean", example: true } } }
    })
    @ApiBadRequestResponse({
        description: "PIN not set or PIN mismatch"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
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
