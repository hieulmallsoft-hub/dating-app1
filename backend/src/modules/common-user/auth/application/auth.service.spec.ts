import { ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "./auth.service";

describe("AuthService Google login security", () => {
    const createService = (googleClientId?: string) => {
        const usersService = {} as any;
        const jwtService = {} as any;
        const configService = {
            get: jest.fn((key: string) => {
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

    it("rejects token when email is not verified", async () => {
        const service = createService("google-client-id");
        mockGoogleVerifyPayload(service, {
            sub: "google-sub",
            email: "user@example.com",
            email_verified: false,
            iss: "https://accounts.google.com"
        });

        await expect(service.loginWithGoogle("id-token")).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("rejects token when issuer is invalid", async () => {
        const service = createService("google-client-id");
        mockGoogleVerifyPayload(service, {
            sub: "google-sub",
            email: "user@example.com",
            email_verified: true,
            iss: "https://evil.example"
        });

        await expect(service.loginWithGoogle("id-token")).rejects.toBeInstanceOf(UnauthorizedException);
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

        const result = await service.loginWithGoogle("id-token");

        expect(verifyIdToken).toHaveBeenCalledWith({
            idToken: "id-token",
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
});
