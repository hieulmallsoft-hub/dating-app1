import {
    Injectable,
    Logger,
    ServiceUnavailableException,
    UnauthorizedException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import { UsersService } from "../../user/application/user.service";
import { AuthProvider } from "../../user/domain/entities/user.entity";

type AuthUser = {
    id: string;
    sub: string | null;
    email: string;
    accountCode: string | null;
    fullName: string | null;
    gender: 0 | 1 | 2 | null;
    avatar: string | null;
    birthDate: string | null;
    role: string;
};

type AuthMeta = {
    isNewUser: boolean;
    needsProfileSetup: boolean;
};

type AuthTokens = {
    access_token: string;
    refresh_token: string;
};

type AuthResult = {
    user: AuthUser;
    tokens: AuthTokens;
    meta: AuthMeta;
};

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);
    private readonly refreshTokenTtlMs = 30 * 24 * 60 * 60 * 1000;
    private readonly googleClient: OAuth2Client;
    private readonly googleClientId?: string;

    constructor(
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService
    ) {
        this.googleClientId = this.configService.get<string>("auth.google.clientId")?.trim();
        this.googleClient = new OAuth2Client(this.googleClientId);
    }

    async createSession(user: any, isNewUser = false): Promise<AuthResult> {
        this.assertAccountCanAuthenticate(user);
        const userWithAccountCode = await this.usersService.ensureAccountCode(user.id);

        const refreshToken = this.generateRefreshToken();
        const refreshTokenExp = this.getRefreshTokenExpiry();
        const tokenVersion = await this.usersService.replaceSession(
            userWithAccountCode.id,
            refreshToken,
            refreshTokenExp
        );

        return {
            user: this.buildAuthUser(userWithAccountCode),
            tokens: this.buildTokens(userWithAccountCode, tokenVersion, refreshToken),
            meta: this.buildAuthMeta(userWithAccountCode, isNewUser)
        };
    }

    async validateSocialUser(socialUser: any): Promise<AuthResult> {
        const provider = socialUser?.provider as AuthProvider | undefined;
        const socialId =
            typeof socialUser?.socialId === "string" ? socialUser.socialId.trim() : undefined;
        const normalizedEmail = this.normalizeEmail(socialUser?.email);

        if (!provider || !socialId || !normalizedEmail) {
            throw new UnauthorizedException("Social account email is required");
        }

        let user = await this.usersService.getUserByProviderAndSocialId(provider, socialId);

        if (user) {
            this.assertAccountCanAuthenticate(user);
            user = await this.usersService.updateUser(user.id, {
                email: normalizedEmail,
                socialId,
                sub: socialId,
                fullName: user.fullName || socialUser.fullName,
                avatar: user.avatar || socialUser.avatar
            });
            return this.createSession(user, false);
        }

        user = await this.usersService.getUserByEmail(normalizedEmail);

        if (!user) {
            user = await this.usersService.createUser({
                email: normalizedEmail,
                fullName: socialUser.fullName,
                avatar: socialUser.avatar,
                socialId,
                sub: socialId,
                provider,
                password: undefined
            });
            return this.createSession(user, true);
        }

        this.assertAccountCanAuthenticate(user);
        const currentSocialSub = user.sub || user.socialId;
        if (currentSocialSub && user.provider === provider && currentSocialSub !== socialId) {
            throw new UnauthorizedException("Social account mismatch");
        }

        user = await this.usersService.updateUser(user.id, {
            socialId,
            sub: socialId,
            provider,
            fullName: user.fullName || socialUser.fullName,
            avatar: user.avatar || socialUser.avatar
        });

        return this.createSession(user, false);
    }

    async loginWithGoogle(idToken: string): Promise<AuthResult> {
        if (!this.googleClientId) {
            this.logger.error("Google login is not configured: missing auth.google.clientId");
            throw new ServiceUnavailableException("Google login is not configured");
        }

        try {
            const ticket = await this.googleClient.verifyIdToken({
                idToken,
                audience: this.googleClientId
            });
            const payload = ticket.getPayload();
            const allowedIssuers = new Set(["accounts.google.com", "https://accounts.google.com"]);

            if (
                !payload?.sub ||
                !payload?.email ||
                payload.email_verified !== true ||
                !allowedIssuers.has(payload.iss || "")
            ) {
                throw new UnauthorizedException("Invalid Google token");
            }

            return this.validateSocialUser({
                email: payload.email.trim().toLowerCase(),
                fullName: payload.name,
                avatar: payload.picture,
                socialId: payload.sub,
                provider: AuthProvider.GOOGLE
            });
        } catch (error) {
            if (error instanceof UnauthorizedException || error instanceof ServiceUnavailableException) {
                throw error;
            }
            this.logger.error(`Google token verification failed: ${error.message}`);
            throw new UnauthorizedException("Invalid Google token");
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
        this.assertAccountCanAuthenticate(user);

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

        const userWithAccountCode = await this.usersService.ensureAccountCode(user.id);

        return {
            user: this.buildAuthUser(userWithAccountCode),
            tokens: this.buildTokens(userWithAccountCode, this.getTokenVersion(userWithAccountCode), refreshToken),
            meta: this.buildAuthMeta(userWithAccountCode, false)
        };
    }



    generateTokens(user: any, tokenVersion = this.getTokenVersion(user)): AuthResult {
        return {
            user: this.buildAuthUser(user),
            tokens: this.buildTokens(user, tokenVersion, this.generateRefreshToken()),
            meta: this.buildAuthMeta(user, false)
        };
    }

    async validateAccessTokenPayload(payload: any) {
        try {
            const user = await this.usersService.getUserById(payload.sub);
            this.assertAccountCanAuthenticate(user);
            const payloadTokenVersion =
                typeof payload?.tokenVersion === "number" ? payload.tokenVersion : 0;
            const currentTokenVersion = this.getTokenVersion(user);

            if (payloadTokenVersion !== currentTokenVersion) {
                throw new UnauthorizedException("Session expired. Please log in again.");
            }

            return {
                sub: user.id,
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

    async checkAccountCodeExists(accountCode: string): Promise<boolean> {
        return this.usersService.accountCodeExists(accountCode);
    }

    private buildAuthUser(user: any): AuthUser {
        return {
            id: user.id,
            sub: user.sub ?? user.socialId ?? null,
            email: user.email,
            accountCode: user.accountCode ?? null,
            fullName: user.fullName ?? null,
            gender: this.normalizeGenderCode(user.gender),
            avatar: user.avatar ?? null,
            birthDate: this.normalizeBirthDate(user.birthDate),
            role: user.role
        };
    }

    private buildAuthMeta(user: any, isNewUser: boolean): AuthMeta {
        return {
            isNewUser,
            needsProfileSetup: !this.hasCompletedProfile(user)
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

    private assertAccountCanAuthenticate(user: { isBanned?: boolean; isActive?: boolean }) {
        if (user.isBanned) {
            throw new UnauthorizedException("Account is banned");
        }

        if (user.isActive === false) {
            throw new UnauthorizedException("Account is inactive");
        }
    }

    private normalizeEmail(email: unknown): string | undefined {
        if (typeof email !== "string") {
            return undefined;
        }
        const normalized = email.trim().toLowerCase();
        return normalized || undefined;
    }

    private normalizeBirthDate(value: unknown): string | null {
        if (!value) {
            return null;
        }
        if (value instanceof Date) {
            return value.toISOString().slice(0, 10);
        }
        if (typeof value === "string") {
            const normalized = value.trim();
            return normalized || null;
        }
        return null;
    }

    private hasCompletedProfile(user: any): boolean {
        const hasGender = this.normalizeGenderCode(user?.gender) !== null;
        return Boolean(hasGender && user?.avatar && this.normalizeBirthDate(user?.birthDate));
    }

    private normalizeGenderCode(value: unknown): 0 | 1 | 2 | null {
        if (value === null || value === undefined) {
            return null;
        }

        if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 2) {
            return value as 0 | 1 | 2;
        }

        if (typeof value === "string") {
            const normalized = value.trim().toUpperCase();
            if (normalized === "0" || normalized === "1" || normalized === "2") {
                return Number(normalized) as 0 | 1 | 2;
            }
            if (normalized === "MALE") {
                return 0;
            }
            if (normalized === "FEMALE") {
                return 1;
            }
            if (normalized === "OTHER") {
                return 2;
            }
        }

        return null;
    }
}
