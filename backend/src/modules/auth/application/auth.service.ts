import { ConflictException, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as appleSignin from "apple-signin-auth";
import * as crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import { comparePassword } from "../../../common/utils/utils";
import { UsersService } from "../../user/application/user.service";
import { AuthProvider } from "../../user/domain/entities/users.model";
import { LoginDto } from "../presentation/dto/login.dto";
import { RegisterDto } from "../presentation/dto/register.dto";

type AuthUser = {
    id: string;
    email: string;
    fullName: string;
    role: string;
};

type AuthTokens = {
    access_token: string;
    refresh_token: string;
};

type AuthResult = {
    user: AuthUser;
    tokens: AuthTokens;
};

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);
    private readonly refreshTokenTtlMs = 30 * 24 * 60 * 60 * 1000;
    private readonly googleClient: OAuth2Client;

    constructor(
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService
    ) {
        this.googleClient = new OAuth2Client(this.configService.get<string>("auth.google.clientId"));
    }

    async validateUser(email: string, password: string) {
        const user = await this.usersService.getUserWithPassword(email);
        if (!user) {
            throw new UnauthorizedException("Thong tin dang nhap khong chinh xac");
        }

        const isPasswordMatching = await comparePassword(password, user.password);
        if (!isPasswordMatching) {
            throw new UnauthorizedException("Thong tin dang nhap khong chinh xac");
        }

        return user;
    }

    async register(registerDto: RegisterDto) {
        const existingUser = await this.usersService.getUserByEmail(registerDto.email);
        if (existingUser) {
            throw new ConflictException("Email da ton tai");
        }

        return this.usersService.createUser(registerDto);
    }

    async login(loginDto: LoginDto): Promise<AuthResult> {
        const user = await this.validateUser(loginDto.email, loginDto.password);
        return this.createSession(user);
    }

    async createSession(user: any): Promise<AuthResult> {
        const refreshToken = this.generateRefreshToken();
        const refreshTokenExp = this.getRefreshTokenExpiry();
        const tokenVersion = await this.usersService.replaceSession(user.id, refreshToken, refreshTokenExp);

        return {
            user: this.buildAuthUser(user),
            tokens: this.buildTokens(user, tokenVersion, refreshToken)
        };
    }

    async validateSocialUser(socialUser: any): Promise<AuthResult> {
        let user = await this.usersService.getUserByEmail(socialUser.email);

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
            user = await this.usersService.updateUser(user.id, {
                socialId: socialUser.socialId,
                provider: socialUser.provider,
                fullName: user.fullName || socialUser.fullName,
                avatar: user.avatar || socialUser.avatar
            });
        }

        return this.createSession(user);
    }

    async loginWithGoogle(idToken: string): Promise<AuthResult> {
        try {
            const ticket = await this.googleClient.verifyIdToken({
                idToken,
                audience: this.configService.get<string>("auth.google.clientId")
            });
            const payload = ticket.getPayload();

            if (!payload?.email) {
                throw new UnauthorizedException("Invalid Google token");
            }

            return this.validateSocialUser({
                email: payload.email,
                fullName: payload.name,
                avatar: payload.picture,
                socialId: payload.sub,
                provider: AuthProvider.GOOGLE
            });
        } catch (error) {
            this.logger.error(`Google token verification failed: ${error.message}`);
            throw new UnauthorizedException("Invalid Google token");
        }
    }

    async loginWithApple(idToken: string): Promise<AuthResult> {
        try {
            const appleId = this.configService.get<string>("auth.apple.clientId");
            const decoded = await appleSignin.verifyIdToken(idToken, {
                audience: appleId
            });

            return this.validateSocialUser({
                email: decoded.email,
                fullName: (decoded as any).name
                    ? `${(decoded as any).name.firstName} ${(decoded as any).name.lastName}`
                    : decoded.email.split("@")[0],
                socialId: decoded.sub,
                provider: AuthProvider.APPLE
            });
        } catch (error) {
            this.logger.error(`Apple token verification failed: ${error.message}`);
            throw new UnauthorizedException("Invalid Apple token");
        }
    }

    async refreshToken(token: string): Promise<AuthResult> {
        if (!token) {
            throw new UnauthorizedException("Refresh token is required");
        }

        const user = await this.usersService.getUserByRefreshToken(token);
        if (!user || !user.refreshTokenExp || user.refreshTokenExp < new Date()) {
            throw new UnauthorizedException("Invalid or expired refresh token");
        }

        const refreshToken = this.generateRefreshToken();
        const refreshTokenExp = this.getRefreshTokenExpiry();
        const rotated = await this.usersService.rotateRefreshToken(
            user.id,
            token,
            refreshToken,
            refreshTokenExp
        );

        if (!rotated) {
            throw new UnauthorizedException("Session expired. Please log in again.");
        }

        return {
            user: this.buildAuthUser(user),
            tokens: this.buildTokens(user, this.getTokenVersion(user), refreshToken)
        };
    }

    async logout(userId: string) {
        await this.usersService.clearSession(userId);
        return { success: true };
    }

    generateTokens(user: any, tokenVersion = this.getTokenVersion(user)): AuthResult {
        return {
            user: this.buildAuthUser(user),
            tokens: this.buildTokens(user, tokenVersion, this.generateRefreshToken())
        };
    }

    async validateAccessTokenPayload(payload: any) {
        try {
            const user = await this.usersService.getUserById(payload.sub);
            const payloadTokenVersion =
                typeof payload?.tokenVersion === "number" ? payload.tokenVersion : 0;
            const currentTokenVersion = this.getTokenVersion(user);

            if (payloadTokenVersion !== currentTokenVersion) {
                throw new UnauthorizedException("Session expired. Please log in again.");
            }

            return {
                id: user.id,
                user_Id: user.id,
                email: user.email,
                fullName: user.fullName,
                role: user.role
            };
        } catch (error) {
            if (error instanceof UnauthorizedException) {
                throw error;
            }

            throw new UnauthorizedException("Session expired. Please log in again.");
        }
    }

    private buildAuthUser(user: any): AuthUser {
        return {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            role: user.role
        };
    }

    private buildTokens(user: any, tokenVersion: number, refreshToken: string): AuthTokens {
        const payload = {
            email: user.email,
            sub: user.id,
            role: user.role,
            tokenVersion
        };

        return {
            access_token: this.jwtService.sign(payload),
            refresh_token: refreshToken
        };
    }

    private generateRefreshToken(): string {
        return crypto.randomBytes(40).toString("hex");
    }

    private getRefreshTokenExpiry(): Date {
        return new Date(Date.now() + this.refreshTokenTtlMs);
    }

    private getTokenVersion(user: { tokenVersion?: number | null }): number {
        return typeof user?.tokenVersion === "number" ? user.tokenVersion : 0;
    }
}
