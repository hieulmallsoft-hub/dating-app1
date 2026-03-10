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
        summary: "Lay thong tin nguoi dung da xac thuc",
        description: "Gui access token trong header Authorization: Bearer <access_token>."
    })
    @ApiOkResponse({
        description: "Thong tin payload/token cua nguoi dung",
        type: AuthProfilePayloadResponseDto
    })
    @ApiUnauthorizedResponse({
        description: "Thieu token truy cap, token het han hoac khong hop le"
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
        summary: "Dang nhap Google cho mobile bang idToken",
        description:
            "Dung endpoint nay cho dang nhap Google. FE lay idToken tu SDK roi gui { idToken }. Backend tao tai khoan o lan dang nhap dau tien va tra ve user, tokens, meta."
    })
    @Public()
    @Post("google")
    @HttpCode(HttpStatus.OK)
    @ApiBody({
        type: SocialLoginDto,
        examples: {
            mobileGoogleLogin: {
                summary: "Payload dang nhap Google",
                value: {
                    idToken: "eyJhbGciOiJSUzI1NiIsImtpZCI6Ij...<google-id-token>"
                }
            }
        }
    })
    @ApiOkResponse({
        description: "Dang nhap Google thanh cong",
        type: AuthSessionResponseDto
    })
    @ApiUnauthorizedResponse({
        description: "idToken Google khong hop le hoac da het han, hoac audience khong khop"
    })
    @ApiBadRequestResponse({
        description: "Thieu idToken"
    })
    async googleLogin(@Body() socialLoginDto: SocialLoginDto, @Res({ passthrough: true }) res: Response) {
        const result = await this.authService.loginWithGoogle(socialLoginDto.idToken);
        this.setTokensCookie(res, result.tokens);
        return result;
    }

    @Public()
    @Post("refresh")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: "Lam moi access token",
        description:
            "Truyen refreshToken trong body HOAC dung cookie refresh_token. API tra ve token moi va xoay vong refresh token."
    })
    @ApiBody({
        type: RefreshTokenDto,
        required: false,
        examples: {
            fromBody: {
                summary: "Gui refresh token trong body",
                value: { refreshToken: "8cc2c3f0f6496f1910d6fe3f2c0de9f4..." }
            },
            fromCookie: {
                summary: "Chi dung cookie",
                value: {}
            }
        }
    })
    @ApiOkResponse({
        description: "Lam moi token thanh cong",
        type: AuthSessionResponseDto
    })
    @ApiUnauthorizedResponse({
        description: "Thieu refresh token, refresh token khong hop le hoac da het han"
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

    @ApiBearerAuth("JWT-auth")
    @Post("logout")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: "Dang xuat",
        description: "Huy phien dang nhap hien tai va xoa cookie token."
    })
    @ApiOkResponse({
        description: "Dang xuat thanh cong",
        type: LogoutResponseDto
    })
    @ApiUnauthorizedResponse({
        description: "Thieu token truy cap hoac token khong hop le"
    })
    async logout(
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
