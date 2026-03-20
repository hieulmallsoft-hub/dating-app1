import {
    Injectable,
    Logger,
    ServiceUnavailableException,
    UnauthorizedException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as crypto from "crypto";
import * as bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import { UsersService } from "../../user/application/user.service";
import { AuthProvider } from "../../user/domain/entities/user.entity";
import { PushTokenRepository } from "../../notifications/infrastructure/persistence/push-token.repository";
import type { PushTokenPlatform } from "../../notifications/domain/entities/push-token.entity";

type AuthUser = {
    id: string;
    accountCode: string | null;
    sub: string | null;
    email: string;
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
    private readonly googleClientIds: string[];
    private readonly googleClientId?: string;

    constructor(
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly pushTokenRepository: PushTokenRepository
    ) {
        this.googleClientIds = this.resolveGoogleClientIds();
        this.googleClientId = this.googleClientIds[0];
        this.googleClient = new OAuth2Client(this.googleClientId);

        if (this.googleClientIds.length > 0) {
            this.logger.log(`Google audiences loaded: ${this.googleClientIds.join(", ")}`);
        } else {
            this.logger.warn("No Google audience configured. Set GOOGLE_CLIENT_ID or GOOGLE_CLIENT_IDS.");
        }
    }

    async createSession(user: any, isNewUser = false): Promise<AuthResult> {
        this.assertAccountCanAuthenticate(user);
        const accountReadyUser =
            user?.accountCode ? user : await this.usersService.ensureAccountCode(user.id);
        const refreshToken = this.generateRefreshToken();
        const refreshTokenExp = this.getRefreshTokenExpiry();
        const tokenVersion = await this.usersService.replaceSession(
            accountReadyUser.id,
            refreshToken,
            refreshTokenExp
        );

        return {
            user: this.buildAuthUser(accountReadyUser),
            tokens: this.buildTokens(accountReadyUser, tokenVersion, refreshToken),
            meta: this.buildAuthMeta(accountReadyUser, isNewUser)
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
        if (this.googleClientIds.length === 0) {
            this.logger.error("Google login is not configured: missing auth.google.clientId");
            throw new ServiceUnavailableException("Google login is not configured");
        }

        const normalizedIdToken = this.normalizeGoogleIdToken(idToken);
        if (!normalizedIdToken) {
            throw new UnauthorizedException("Google idToken is required");
        }
        if (!this.isWellFormedJwt(normalizedIdToken)) {
            throw new UnauthorizedException("Malformed Google idToken");
        }


        try {
            const audience: string | string[] =
                this.googleClientIds.length === 1 ? this.googleClientIds[0] : this.googleClientIds;
            const ticket = await this.googleClient.verifyIdToken({
                idToken: normalizedIdToken,
                audience
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

            const reason = this.sanitizeGoogleVerifyErrorMessage(error);
            this.logger.error(`Google token verification failed: ${reason}`);

            const normalizedReason = reason.toLowerCase();
            if (normalizedReason.includes("wrong recipient") || normalizedReason.includes("audience")) {
                throw new UnauthorizedException("Google token audience mismatch");
            }
            if (normalizedReason.includes("invalid token signature")) {
                throw new UnauthorizedException("Invalid Google token signature");
            }

            throw new UnauthorizedException("Invalid Google token");
        }
    }

    async registerWithEmail(email: string, password: string, fullName?: string): Promise<AuthResult> {
        const normalizedEmail = this.normalizeEmail(email);
        const normalizedPassword = this.normalizePassword(password);
        if (!normalizedEmail) {
            throw new UnauthorizedException("Email is required");
        }
        if (!normalizedPassword || normalizedPassword.length < 6) {
            throw new UnauthorizedException("Password must be at least 6 characters");
        }

        const normalizedFullName =
            typeof fullName === "string" ? fullName.trim() || undefined : undefined;
        const user = await this.usersService.createUser({
            email: normalizedEmail,
            fullName: normalizedFullName,
            password: normalizedPassword,
            provider: AuthProvider.LOCAL
        });
        return this.createSession(user, true);
    }

    async loginWithEmail(email: string, password: string): Promise<AuthResult> {
        const normalizedEmail = this.normalizeEmail(email);
        const normalizedPassword = this.normalizePassword(password);
        if (!normalizedEmail || !normalizedPassword) {
            throw new UnauthorizedException("Email and password are required");
        }

        const user = await this.usersService.getUserWithPassword(normalizedEmail);
        if (!user?.password) {
            throw new UnauthorizedException("Invalid email or password");
        }

        const isPasswordMatched = await bcrypt.compare(normalizedPassword, user.password);
        if (!isPasswordMatched) {
            throw new UnauthorizedException("Invalid email or password");
        }

        return this.createSession(user, false);
    }

    async logout(userId: string): Promise<void> {
        await this.usersService.clearSession(userId);
    }

    async saveFcmToken(userId: string, fcmToken: string, platform: PushTokenPlatform = "android") {
        const cleanToken = fcmToken.trim();
        if (!cleanToken) return null;

        await this.pushTokenRepository.upsert(
            {
                userId,
                token: cleanToken,
                platform
            },
            ["token"]
        );

        const savedPushToken = await this.pushTokenRepository.findOne({
            where: { token: cleanToken },
            select: ["id"]
        });

        return savedPushToken?.id ?? null;
    }

    async removeFcmToken(userId: string, fcmToken: string) {
        const cleanToken = fcmToken.trim();
        if (!cleanToken) return;
        await this.pushTokenRepository.delete({
            userId,
            token: cleanToken
        });
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

        return {
            user: this.buildAuthUser(user),
            tokens: this.buildTokens(user, this.getTokenVersion(user), refreshToken),
            meta: this.buildAuthMeta(user, false)
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
    private buildAuthUser(user: any): AuthUser {
        return {
            id: user.id,
            accountCode: user.accountCode ?? null,
            sub: user.sub ?? user.socialId ?? null,
            email: user.email,
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

    private normalizePassword(password: unknown): string | undefined {
        if (typeof password !== "string") {
            return undefined;
        }
        const normalized = password.trim();
        return normalized || undefined;
    }

    private resolveGoogleClientIds() {
        const configuredClientIds = this.configService.get<string[] | string>("auth.google.clientIds");
        const fallbackClientId = this.configService.get<string>("auth.google.clientId");

        const fromConfig =
            typeof configuredClientIds === "string"
                ? configuredClientIds.split(",")
                : Array.isArray(configuredClientIds)
                  ? configuredClientIds
                  : [];

        const normalized = [...fromConfig, fallbackClientId]
            .filter((value): value is string => typeof value === "string")
            .map((value) => value.trim())
            .filter((value) => value.length > 0);

        return Array.from(new Set(normalized));
    }

    private normalizeGoogleIdToken(value: unknown): string {
        if (typeof value !== "string") {
            return "";
        }

        const trimmed = value.trim();
        const unquoted = trimmed.replace(/^"(.*)"$/, "$1").trim();
        const withoutBearer = unquoted.replace(/^Bearer\s+/i, "");
        return withoutBearer.replace(/\s+/g, "");
    }

    private sanitizeGoogleVerifyErrorMessage(error: unknown): string {
        const rawMessage = error instanceof Error ? error.message : String(error ?? "unknown error");
        const jwtPattern = /([A-Za-z0-9\-_]+\.){2}[A-Za-z0-9\-_]+/g;
        return rawMessage.replace(jwtPattern, "[redacted-jwt]");
    }

    private isWellFormedJwt(token: string): boolean {
        const parts = token.split(".");
        if (parts.length !== 3) {
            return false;
        }

        const base64UrlPattern = /^[A-Za-z0-9\-_]+$/;
        return parts.every(
            (part) => part.length > 0 && base64UrlPattern.test(part) && part.length % 4 !== 1
        );
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

