import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { AuthService } from "../../application/auth.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private readonly configService: ConfigService,
        private readonly authService: AuthService
    ) {
        super({
            jwtFromRequest: (req) => {
                let token = null;
                if (req && req.cookies) {
                    token = req.cookies["access_token"];
                }

                return token || ExtractJwt.fromAuthHeaderAsBearerToken()(req);
            },
            ignoreExpiration: false,
            secretOrKey: configService.get<string>("JWT_SECRET") || "secretKey"
        });
    }

    async validate(payload: any) {
        return this.authService.validateAccessTokenPayload(payload);
    }
}
