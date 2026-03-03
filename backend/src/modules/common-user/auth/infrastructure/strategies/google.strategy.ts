import { PassportStrategy } from "@nestjs/passport";
import { Strategy, VerifyCallback } from "passport-google-oauth20";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AuthProvider } from "../../../user/domain/entities/users.enity";
import { resolveOAuthCallbackUrl } from "../../../../../config/auth.config";

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, "google") {
    constructor(private configService: ConfigService) {
        const clientID = configService.get<string>("auth.google.clientId")?.trim();
        const clientSecret = configService.get<string>("auth.google.clientSecret")?.trim();
        const callbackURL = configService.get<string>("auth.google.callbackUrl")?.trim() || resolveOAuthCallbackUrl("google");

        if (!clientID || !clientSecret) {
            Logger.warn(
                "Google OAuth is not fully configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET before using /auth/google.",
                GoogleStrategy.name
            );
        }

        super({
            clientID: clientID || "GOOGLE_OAUTH_NOT_CONFIGURED",
            clientSecret: clientSecret || "GOOGLE_OAUTH_NOT_CONFIGURED",
            callbackURL,
            scope: ["email", "profile"]
        });
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

