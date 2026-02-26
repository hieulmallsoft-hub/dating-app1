import { PassportStrategy } from "@nestjs/passport";
import { Strategy, VerifyCallback } from "passport-google-oauth20";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AuthProvider } from "../../../user/domain/entities/users\.model";

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, "google") {
    constructor(private configService: ConfigService) {
        const rawID = configService.get<string>("auth.google.clientId");
        const rawURL = configService.get<string>("auth.google.callbackUrl");
        const rawSecret = configService.get<string>("auth.google.clientSecret");

        // Standardize: No trailing slash, use 127.0.0.1
        let finalURL = (rawURL || "http://localhost:3000/auth/google/callback")
            .replace("localhost", "127.0.0.1")
            .trim();
        if (finalURL.endsWith("/")) {
            finalURL = finalURL.slice(0, -1);
        }

        const googleOptions = {
            clientID: (rawID || "google-id").trim(),
            clientSecret: (rawSecret || "google-secret").trim(),
            callbackURL: finalURL,
            scope: ["email", "profile"]
        };

        super(googleOptions);
    }

    async validate(accessToken: string, refreshToken: string, profile: any, done: VerifyCallback): Promise<any> {
        const { name, emails, photos } = profile;
        const user = {
            email: emails[0].value,
            fullName: `${name.givenName} ${name.familyName}`,
            avatar: photos[0].value,
            socialId: profile.id,
            provider: AuthProvider.GOOGLE,
            accessToken
        };
        done(null, user);
    }
}
