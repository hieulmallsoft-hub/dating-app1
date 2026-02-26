import { Injectable, UnauthorizedException, ConflictException, Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { UsersService } from "../../user/application/user.service";
import { RegisterDto } from "../presentation/dto/register.dto";
import { LoginDto } from "../presentation/dto/login.dto";
import { comparePassword } from "../../../common/utils/utils";
import { AuthProvider } from "../../user/domain/entities/users\.model";
import { OAuth2Client } from "google-auth-library";
import * as appleSignin from "apple-signin-auth";
import * as crypto from "crypto";

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);
    private googleClient: OAuth2Client;

    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        private configService: ConfigService
    ) {
        this.googleClient = new OAuth2Client(this.configService.get<string>("auth.google.clientId"));
    }

    async validateUser(email: string, pass: string): Promise<any> {
        const user = await this.usersService.getUserWithPassword(email);
        if (!user) {
            throw new UnauthorizedException("Thông tin đăng nhập không chính xác");
        }
        const isPasswordMatching = await comparePassword(pass, user.password);
        if (!isPasswordMatching) {
            throw new UnauthorizedException("Thông tin đăng nhập không chính xác");
        }
        return user;
    }

    async register(registerDto: RegisterDto) {
        const existingUser = await this.usersService.getUserByEmail(registerDto.email);

        if (existingUser) {
            throw new ConflictException("Email đã tồn tại");
        }
        return this.usersService.createUser(registerDto);
    }

    async login(loginDto: LoginDto) {
        const user = await this.validateUser(loginDto.email, loginDto.password);
        return this.generateTokens(user);
    }

    async validateSocialUser(socialUser: any) {
        let user: any = await this.usersService.getUserByEmail(socialUser.email);

        if (!user) {
            user = await this.usersService.createUser({
                email: socialUser.email,
                fullName: socialUser.fullName,
                avatar: socialUser.avatar,
                socialId: socialUser.socialId,
                provider: socialUser.provider,
                password: null
            } as any);
        } else {
            user.socialId = socialUser.socialId;
            user.provider = socialUser.provider;
            // Optionally update user info here
        }

        return this.generateTokens(user);
    }

    async loginWithGoogle(idToken: string) {
        try {
            const ticket = await this.googleClient.verifyIdToken({
                idToken,
                audience: this.configService.get<string>("auth.google.clientId")
            });
            const payload = ticket.getPayload();

            const socialUser = {
                email: payload.email,
                fullName: payload.name,
                avatar: payload.picture,
                socialId: payload.sub,
                provider: AuthProvider.GOOGLE
            };

            return this.validateSocialUser(socialUser);
        } catch (error) {
            this.logger.error(`Google token verification failed: ${error.message}`);
            throw new UnauthorizedException("Invalid Google token");
        }
    }

    async loginWithApple(idToken: string) {
        try {
            const appleId = this.configService.get<string>("auth.apple.clientId"); // Service ID
            const decoded = await appleSignin.verifyIdToken(idToken, {
                audience: appleId
            });

            const socialUser = {
                email: decoded.email,
                fullName: (decoded as any).name
                    ? `${(decoded as any).name.firstName} ${(decoded as any).name.lastName}`
                    : decoded.email.split("@")[0],
                socialId: decoded.sub,
                provider: AuthProvider.APPLE
            };

            return this.validateSocialUser(socialUser);
        } catch (error) {
            this.logger.error(`Apple token verification failed: ${error.message}`);
            throw new UnauthorizedException("Invalid Apple token");
        }
    }

    async refreshToken(token: string) {
        const user = await this.usersService.getUserByRefreshToken(token);
        if (!user || user.refreshTokenExp < new Date()) {
            throw new UnauthorizedException("Invalid or expired refresh token");
        }

        return this.generateTokens(user);
    }

    async logout(userId: string) {
        await this.usersService.updateRefreshToken(userId, null, null);
        return { success: true };
    }

    async generateTokens(user: any) {
        const payload = { email: user.email, sub: user.id, role: user.role };
        const accessToken = this.jwtService.sign(payload);

        // Generate refresh token
        const refreshToken = crypto.randomBytes(40).toString("hex");
        const refreshTokenExp = new Date();
        refreshTokenExp.setDate(refreshTokenExp.getDate() + 30); // 30 days

        await this.usersService.updateRefreshToken(user.id, refreshToken, refreshTokenExp);

        return {
            tokens: {
                access_token: accessToken,
                refresh_token: refreshToken
            },
            user: {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                role: user.role
            }
        };
    }
}
