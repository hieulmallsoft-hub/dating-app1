import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Post,
    Req,
    Res,
    UseGuards
} from "@nestjs/common";
import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiBody,
    ApiExcludeEndpoint,
    ApiOkResponse,
    ApiOperation,
    ApiTags,
    ApiUnauthorizedResponse
} from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import { Request, Response } from "express";
import { AuthService } from "../application/auth.service";
import {
    AuthProfilePayloadResponseDto,
    AuthSessionResponseDto,
    MobileGoogleAuthResponseDto,
    RefreshTokenDto,
    SocialLoginDto
} from "./dto/auth-ops.dto";
import { GoogleAuthGuard } from "../infrastructure/strategies/google-auth.guard";
import { Public } from "src/common/decorators/customize";

@ApiTags("auth-mobile")
@Controller("auth")
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly configService: ConfigService
    ) {}

    @ApiBearerAuth("JWT-auth")
    @Get("profile")
    @ApiOperation({
        summary: "Get current authenticated user payload",
        description: "Send access token in Authorization header: Bearer <access_token>."
    })
    @ApiOkResponse({
        description: "Token payload/user info",
        type: AuthProfilePayloadResponseDto
    })
    @ApiUnauthorizedResponse({
        description: "Missing/expired/invalid access token"
    })
    getProfile(@Req() req: Request & { user: any }) {
        return req.user;
    }

    @ApiExcludeEndpoint()
    @Public()
    @Get("google")
    @UseGuards(GoogleAuthGuard)
    async googleAuth(@Req() _req: Request) {}

    @ApiExcludeEndpoint()
    @Public()
    @Get("google/callback")
    @UseGuards(GoogleAuthGuard)
    async googleAuthRedirect(@Req() req: Request & { user: any }, @Res() res: Response) {
        const result = await this.authService.validateSocialUser(req.user);
        this.setTokensCookie(res, result.tokens);

        const frontendUrl = this.configService.get("CORS_ORIGIN") || "http://localhost:5173";
        return res.redirect(
            `${frontendUrl}?access_token=${result.tokens.access_token}&refresh_token=${result.tokens.refresh_token}`
        );
    }

    @ApiOperation({
        summary: "Google login for mobile using idToken",
        description:
            "Use this endpoint for Google-only auth. FE gets Google idToken from SDK, then sends { idToken }. Backend creates account on first login and returns user+meta."
    })
    @Public()
    @Post("google")
    @HttpCode(HttpStatus.OK)
    @ApiBody({
        type: SocialLoginDto,
        examples: {
            mobileGoogleLogin: {
                summary: "Google login payload",
                value: {
                    idToken: "eyJhbGciOiJSUzI1NiIsImtpZCI6Ij...<google-id-token>"
                }
            }
        }
    })
    @ApiOkResponse({
        description: "Google login success",
        type: MobileGoogleAuthResponseDto
    })
    @ApiUnauthorizedResponse({
        description: "Invalid or expired Google idToken, or audience mismatch"
    })
    @ApiBadRequestResponse({
        description: "Missing idToken"
    })
    async googleLogin(@Body() socialLoginDto: SocialLoginDto, @Res({ passthrough: true }) res: Response) {
        const result = await this.authService.loginWithGoogle(socialLoginDto.idToken);
        this.setTokensCookie(res, result.tokens);
        return {
            user: result.user,
            meta: result.meta
        };
    }

    @Public()
    @Post("refresh")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: "Refresh access token",
        description:
            "Provide refreshToken in body OR rely on refresh_token cookie. Returns new tokens and rotates refresh token."
    })
    @ApiBody({
        type: RefreshTokenDto,
        required: false,
        examples: {
            fromBody: {
                summary: "Send refresh token in body",
                value: { refreshToken: "8cc2c3f0f6496f1910d6fe3f2c0de9f4..." }
            },
            fromCookie: {
                summary: "Use cookie only",
                value: {}
            }
        }
    })
    @ApiOkResponse({
        description: "Token refresh success",
        type: AuthSessionResponseDto
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid/expired refresh token"
    })
    async refreshToken(
        @Body() refreshTokenDto: RefreshTokenDto,
        @Req() req: Request & { cookies?: Record<string, string> },
        @Res({ passthrough: true }) res: Response
    ) {
        const refreshToken = refreshTokenDto.refreshToken || req.cookies?.refresh_token;
        const result = await this.authService.refreshToken(refreshToken);
        this.setTokensCookie(res, result.tokens);
        return result;
    }



    private setTokensCookie(res: Response, tokens: { access_token: string; refresh_token: string }) {
        res.cookie("access_token", tokens.access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 3600000 // 1 hour
        });
        res.cookie("refresh_token", tokens.refresh_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 30 * 24 * 3600000 // 30 days
        });
    }
}
