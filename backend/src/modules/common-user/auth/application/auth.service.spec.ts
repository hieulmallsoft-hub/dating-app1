import { ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "./auth.service";

describe("AuthService Google login security", () => {
    const validJwt = "eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxIn0.c2ln";

    const createService = (googleClientId?: string, googleClientIds?: string[], usersServiceOverride?: any) => {
        const usersService =
            usersServiceOverride ||
            ({
                clearSession: jest.fn()
            } as any);
        const jwtService = {} as any;
        const configService = {
            get: jest.fn((key: string) => {
                if (key === "auth.google.clientIds") {
                    return googleClientIds;
                }
                if (key === "auth.google.clientId") {
                    return googleClientId;
                }
                return undefined;
            })
        } as any;

        return new AuthService(usersService, jwtService, configService);
    };

    const mockGoogleVerifyPayload = (service: AuthService, payload: any) => {
        const verifyIdToken = jest.fn().mockResolvedValue({
            getPayload: () => payload
        });
        (service as any).googleClient = {
            verifyIdToken
        };
        return verifyIdToken;
    };

    it("rejects Google login when GOOGLE_CLIENT_ID is missing", async () => {
        const service = createService(undefined);
        const verifyIdToken = jest.fn();
        (service as any).googleClient = { verifyIdToken };

        await expect(service.loginWithGoogle("id-token")).rejects.toBeInstanceOf(
            ServiceUnavailableException
        );
        expect(verifyIdToken).not.toHaveBeenCalled();
    });

    it("rejects malformed JWT before calling Google verification", async () => {
        const service = createService("google-client-id");
        const verifyIdToken = jest.fn();
        (service as any).googleClient = { verifyIdToken };

        await expect(service.loginWithGoogle("a.b.c")).rejects.toThrow("Malformed Google idToken");
        expect(verifyIdToken).not.toHaveBeenCalled();
    });

    it("rejects token when email is not verified", async () => {
        const service = createService("google-client-id");
        mockGoogleVerifyPayload(service, {
            sub: "google-sub",
            email: "user@example.com",
            email_verified: false,
            iss: "https://accounts.google.com"
        });

        await expect(service.loginWithGoogle(validJwt)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("rejects token when issuer is invalid", async () => {
        const service = createService("google-client-id");
        mockGoogleVerifyPayload(service, {
            sub: "google-sub",
            email: "user@example.com",
            email_verified: true,
            iss: "https://evil.example"
        });

        await expect(service.loginWithGoogle(validJwt)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("maps verified payload and delegates to social validation", async () => {
        const service = createService("google-client-id");
        const verifyIdToken = mockGoogleVerifyPayload(service, {
            sub: "google-sub-123",
            email: "User@Example.com",
            name: "User One",
            picture: "https://example.com/avatar.png",
            email_verified: true,
            iss: "accounts.google.com"
        });

        const expected = {
            user: {
                id: "user-id",
                email: "user@example.com",
                fullName: "User One",
                role: "USER"
            },
            tokens: {
                access_token: "access",
                refresh_token: "refresh"
            }
        };

        const validateSocialUserSpy = jest
            .spyOn(service, "validateSocialUser")
            .mockResolvedValue(expected as any);

        const result = await service.loginWithGoogle(`  ${validJwt}  `);

        expect(verifyIdToken).toHaveBeenCalledWith({
            idToken: validJwt,
            audience: "google-client-id"
        });
        expect(validateSocialUserSpy).toHaveBeenCalledWith({
            email: "user@example.com",
            fullName: "User One",
            avatar: "https://example.com/avatar.png",
            socialId: "google-sub-123",
            provider: "GOOGLE"
        });
        expect(result).toEqual(expected);
    });

    it("normalizes bearer prefix and internal whitespace in idToken", async () => {
        const service = createService("google-client-id");
        const verifyIdToken = mockGoogleVerifyPayload(service, {
            sub: "google-sub-123",
            email: "user@example.com",
            name: "User One",
            picture: "https://example.com/avatar.png",
            email_verified: true,
            iss: "accounts.google.com"
        });

        jest.spyOn(service, "validateSocialUser").mockResolvedValue({ user: {}, tokens: {}, meta: {} } as any);

        const formattedToken = `Bearer ${validJwt.slice(0, 12)} \n ${validJwt.slice(12)}`;
        await service.loginWithGoogle(formattedToken);

        expect(verifyIdToken).toHaveBeenCalledWith({
            idToken: validJwt,
            audience: "google-client-id"
        });
    });

    it("accepts multiple configured Google audiences", async () => {
        const service = createService(undefined, ["android-client-id", "ios-client-id"]);
        const verifyIdToken = mockGoogleVerifyPayload(service, {
            sub: "google-sub-abc",
            email: "user@example.com",
            name: "User One",
            picture: "https://example.com/avatar.png",
            email_verified: true,
            iss: "https://accounts.google.com"
        });

        const validateSocialUserSpy = jest
            .spyOn(service, "validateSocialUser")
            .mockResolvedValue({ user: {}, tokens: {}, meta: {} } as any);

        await service.loginWithGoogle(validJwt);

        expect(verifyIdToken).toHaveBeenCalledWith({
            idToken: validJwt,
            audience: ["android-client-id", "ios-client-id"]
        });
        expect(validateSocialUserSpy).toHaveBeenCalled();
    });

    it("redacts JWT from verification error logs and returns signature error", async () => {
        const service = createService("google-client-id");
        const loggedErrors: string[] = [];
        (service as any).logger = {
            error: (message: string) => loggedErrors.push(message)
        };

        const rawJwt = "aaa.bbb.ccc";
        (service as any).googleClient = {
            verifyIdToken: jest
                .fn()
                .mockRejectedValue(new Error(`Invalid token signature: ${rawJwt}`))
        };

        await expect(service.loginWithGoogle(validJwt)).rejects.toThrow(
            "Invalid Google token signature"
        );
        expect(loggedErrors[0]).toContain("[redacted-jwt]");
        expect(loggedErrors[0]).not.toContain(rawJwt);
    });

    it("clears server-side session on logout", async () => {
        const usersService = {
            clearSession: jest.fn().mockResolvedValue(1)
        } as any;
        const service = createService("google-client-id", undefined, usersService);

        await service.logout("user-id-1");

        expect(usersService.clearSession).toHaveBeenCalledWith("user-id-1");
    });
});
