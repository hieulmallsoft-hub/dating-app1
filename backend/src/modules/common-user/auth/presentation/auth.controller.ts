import {
    Controller,
    Post,
    Body,
    HttpCode,
    HttpStatus,
    UseGuards,
    Get,
    Req,
    Logger,
    Res,
    Query,
    UnauthorizedException
} from "@nestjs/common";
import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiBody,
    ApiConflictResponse,
    ApiCreatedResponse,
    ApiExcludeEndpoint,
    ApiOkResponse,
    ApiOperation,
    ApiTags,
    ApiUnauthorizedResponse
} from "@nestjs/swagger";
import { Request, Response } from "express";
import { AuthGuard } from "@nestjs/passport";
import { ConfigService } from "@nestjs/config";
import { AuthService } from "../application/auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import {
    SocialLoginDto,
    RefreshTokenDto,
    AuthSessionResponseDto,
    MobileGoogleAuthResponseDto,
    LogoutResponseDto,
    CheckAccountCodeQueryDto,
    CheckAccountCodeResponseDto
} from "./dto/auth-ops.dto";
import { GoogleAuthGuard } from "../infrastructure/strategies/google-auth.guard";
import { Public } from "src/common/decorators/customize";

@ApiTags("auth-mobile")
@Controller("auth")
export class AuthController {
    private readonly logger = new Logger(AuthController.name);

    constructor(
        private authService: AuthService,
        private configService: ConfigService
    ) {}

    // register
    @Post("register")
    @Public()
    @ApiOperation({
        summary: "Register account",
        description:
            "Create a new account. Required fields: email, gender, birthDate. Optional fields: fullName, avatar. On success, returns user + tokens and also sets httpOnly cookies: access_token and refresh_token."
    })
    @ApiCreatedResponse({
        description: "Register success",
        type: AuthSessionResponseDto
    })
    @ApiBadRequestResponse({
        description: "Invalid request body (email format, missing gender/birthDate, invalid avatar URL...)"
    })
    @ApiConflictResponse({
        description: "Email already exists"
    })
    async register(@Body() registerDto: RegisterDto, @Res({ passthrough: true }) res: Response) {
        this.logger.log(`Register request for email: ${registerDto.email}`);
        try {
            const user = await this.authService.register(registerDto);
            this.logger.log(`Đăng ký thành công: ${registerDto.email}`);

            const result = await this.authService.createSession(user, true);
            this.setTokensCookie(res, result.tokens);

            return result;
        } catch (error) {
            this.logger.error(`Lỗi khi đăng ký: ${error.message}`, error.stack);
            throw error;
        }
    }
    //login
    @Post("login")
    @Public()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: "Login with email/password",
        description:
            "Mobile/local login. Requires email + password. Returns user + tokens and sets token cookies."
    })
    @ApiOkResponse({
        description: "Login success",
        type: AuthSessionResponseDto
    })
    @ApiUnauthorizedResponse({
        description: "Wrong credentials, banned account, or inactive account"
    })
    @ApiBadRequestResponse({
        description: "Invalid request body"
    })
    async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response) {
        const result = await this.authService.login(loginDto);
        this.setTokensCookie(res, result.tokens);
        return result;
    }

    // @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("JWT-auth")
    @Get("profile")
    @ApiOperation({
        summary: "Get current authenticated user payload",
        description: "Send access token in Authorization header: Bearer <access_token>."
    })
    @ApiOkResponse({
        description: "Token payload/user info",
        schema: {
            type: "object",
            properties: {
                sub: { type: "string", example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8" },
                id: { type: "string", example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8" },
                user_Id: { type: "string", example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8" },
                email: { type: "string", example: "mobile.user@example.com" },
                fullName: { type: "string", example: "Mobile User" },
                role: { type: "string", example: "USER" }
            }
        }
    })
    @ApiUnauthorizedResponse({
        description: "Missing/expired/invalid access token"
    })
    getProfile(@Req() req: Request & { user: any }) {
        return req.user;
    }

    @Public()
    @Get("account-code/exists")
    @ApiOperation({
        summary: "Check account code exists",
        description:
            "Returns true/false for a stable accountCode. Useful when mobile needs to check account availability by code."
    })
    @ApiOkResponse({
        description: "Check result",
        type: CheckAccountCodeResponseDto
    })
    @ApiBadRequestResponse({
        description: "Missing or invalid code query"
    })
    async checkAccountCodeExists(@Query() query: CheckAccountCodeQueryDto) {
        const exists = await this.authService.checkAccountCodeExists(query.code);
        return { exists };
    }

    // Google Auth
    @ApiExcludeEndpoint()
    @Public()
    @Get("google")
    @UseGuards(GoogleAuthGuard)
    async googleAuth(@Req() req) {}

    @ApiExcludeEndpoint()
    @Public()
    @Get("google/callback")
    @UseGuards(GoogleAuthGuard)
    async googleAuthRedirect(@Req() req, @Res() res: Response) {
        const result = await this.authService.validateSocialUser(req.user);
        this.setTokensCookie(res, result.tokens);

        const frontendUrl = this.configService.get("CORS_ORIGIN") || "http://localhost:5173";
        return res.redirect(
            `${frontendUrl}?access_token=${result.tokens.access_token}&refresh_token=${result.tokens.refresh_token}`
        );
    }

    // Apple Auth
    @ApiExcludeEndpoint()
    @Public()
    @Get("apple")
    @UseGuards(AuthGuard("apple"))
    async appleAuth(@Req() req) {}

    @ApiExcludeEndpoint()
    @Public()
    @Post("apple/callback")
    @UseGuards(AuthGuard("apple"))
    async appleAuthRedirect(@Req() req, @Res() res: Response) {
        const result = await this.authService.validateSocialUser(req.user);
        this.setTokensCookie(res, result.tokens);

        const frontendUrl = this.configService.get("CORS_ORIGIN") || "http://localhost:5173";
        return res.redirect(
            `${frontendUrl}?access_token=${result.tokens.access_token}&refresh_token=${result.tokens.refresh_token}`
        );
    }

    // Social Login POST (for Mobile/Android/iOS)
    @ApiOperation({
        summary: "Google login for mobile using idToken",
        description:
            "Use this endpoint for mobile auth. FE must first get Google idToken from native/web Google Sign-In SDK, then send { idToken }. Response returns user+meta only; tokens are set in httpOnly cookies."
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

    @ApiExcludeEndpoint()
    @Public()
    @Post("apple")
    @HttpCode(HttpStatus.OK)
    async appleLogin(@Body() socialLoginDto: SocialLoginDto, @Res({ passthrough: true }) res: Response) {
        const result = await this.authService.loginWithApple(socialLoginDto.idToken);
        this.setTokensCookie(res, result.tokens);
        return result;
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

    @ApiBearerAuth("JWT-auth")
    @Post("logout")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: "Logout current user",
        description: "Requires access token. Clears access_token + refresh_token cookies and invalidates session."
    })
    @ApiOkResponse({
        description: "Logout success",
        type: LogoutResponseDto
    })
    @ApiUnauthorizedResponse({
        description: "Invalid access token"
    })
    async logout(@Req() req, @Res({ passthrough: true }) res: Response) {
        res.clearCookie("access_token");
        res.clearCookie("refresh_token");
        const userId = req.user?.id || req.user?.sub || req.user?.user_Id;
        if (!userId) {
            throw new UnauthorizedException("Invalid access token payload");
        }
        return this.authService.logout(userId);
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
