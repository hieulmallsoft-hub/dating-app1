import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Post,
    Req,
    Res,
    UnauthorizedException,
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
    LogoutResponseDto,
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
        summary: "Get authenticated user info",
        description: "Send access token in Authorization header: Bearer <access_token>."
    })
    @ApiOkResponse({
        description: "Authenticated user payload information",
        type: AuthProfilePayloadResponseDto
    })
    @ApiUnauthorizedResponse({
        description: "Missing access token, expired token, or invalid token"
    })
    getAuthProfile(@Req() req: Request & { user: any }) {
        return req.user;
    }

    @ApiExcludeEndpoint()
    @Public()
    @Get("google")
    @UseGuards(GoogleAuthGuard)
    async startGoogleOAuth(@Req() _req: Request) {}

    @ApiExcludeEndpoint()
    @Public()
    @Get("google/callback")
    @UseGuards(GoogleAuthGuard)
    async handleGoogleOAuthCallback(@Req() req: Request & { user: any }, @Res() res: Response) {
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
            "Use this endpoint for Google login. FE gets idToken from SDK and sends { idToken }. Backend creates account on first login and returns user, tokens, and meta."
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
        description: "Google login successful",
        type: AuthSessionResponseDto
    })
    @ApiUnauthorizedResponse({
        description: "Google idToken is invalid, expired, or has audience mismatch"
    })
    @ApiBadRequestResponse({
        description: "Missing idToken"
    })
    async loginWithGoogle(@Body() socialLoginDto: SocialLoginDto, @Res({ passthrough: true }) res: Response) {
        const result = await this.authService.loginWithGoogle(socialLoginDto.idToken);
        this.setTokensCookie(res, result.tokens);
        return result;
    }

    @Public()
    @Post("refresh")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: "Refresh access token",
        description:
            "Pass refreshToken in body OR use refresh_token cookie. API returns a new access token and rotates refresh token."
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
        description: "Token refreshed successfully",
        type: AuthSessionResponseDto
    })
    @ApiUnauthorizedResponse({
        description: "Missing refresh token, invalid refresh token, or expired refresh token"
    })
    async refreshAuthToken(
        @Body() refreshTokenDto: RefreshTokenDto,
        @Req() req: Request & { cookies?: Record<string, string> },
        @Res({ passthrough: true }) res: Response
    ) {
        const refreshToken = refreshTokenDto.refreshToken || req.cookies?.refresh_token;
        const result = await this.authService.refreshToken(refreshToken);
        this.setTokensCookie(res, result.tokens);
        return result;
    }

    @ApiBearerAuth("JWT-auth")
    @Post("logout")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: "Logout",
        description: "Revoke current login session and clear token cookie."
    })
    @ApiOkResponse({
        description: "Logout successful",
        type: LogoutResponseDto
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async logoutSession(
        @Req() req: Request & { user?: { sub?: string; id?: string; user_Id?: string } },
        @Res({ passthrough: true }) res: Response
    ) {
        const userId = this.getCurrentUserId(req);
        await this.authService.logout(userId);
        this.clearTokensCookie(res);
        return { success: true };
    }

    private setTokensCookie(res: Response, tokens: { access_token: string; refresh_token: string }) {
        const cookieOptions = this.getTokenCookieOptions();
        res.cookie("access_token", tokens.access_token, {
            ...cookieOptions,
            maxAge: 3600000 // 1 hour
        });
        res.cookie("refresh_token", tokens.refresh_token, {
            ...cookieOptions,
            maxAge: 30 * 24 * 3600000 // 30 days
        });
    }

    private clearTokensCookie(res: Response) {
        const cookieOptions = this.getTokenCookieOptions();
        res.clearCookie("access_token", cookieOptions);
        res.clearCookie("refresh_token", cookieOptions);
    }

    private getTokenCookieOptions() {
        return {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax" as const
        };
    }

    private getCurrentUserId(req: { user?: { sub?: string; id?: string; user_Id?: string } }) {
        const userId = req.user?.sub || req.user?.id || req.user?.user_Id;
        if (!userId) {
            throw new UnauthorizedException("Invalid access token payload");
        }
        return userId;
    }
}
