import { ExtractJwt, Strategy } from "passport-jwt";
import { PassportStrategy } from "@nestjs/passport";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AuthService } from "../../application/auth.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private configService: ConfigService,
        private authService: AuthService
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
        // payload từ token: { sub, email, role }
        return {
            id: payload.sub, // Ensure standard 'id' field is available
            user_Id: payload.sub, // Keep backward compatibility
            email: payload.email,
            role: payload.role
        };
    }
}
