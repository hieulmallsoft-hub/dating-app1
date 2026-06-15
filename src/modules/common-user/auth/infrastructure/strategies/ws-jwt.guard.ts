import { CanActivate, ExecutionContext, Injectable, Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { WsException } from "@nestjs/websockets";
import { Socket } from "socket.io";
import { AuthService } from "../../application/auth.service";

@Injectable()
export class WsJwtGuard implements CanActivate {
    private readonly logger = new Logger(WsJwtGuard.name);

    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly authService: AuthService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        try {
            const client: Socket = context.switchToWs().getClient<Socket>();
            const token = this.extractToken(client);

            if (!token) {
                throw new WsException("Unauthorized");
            }

            const payload = await this.jwtService.verifyAsync(token, {
                secret: this.configService.get("JWT_SECRET")
            });

            const user = await this.authService.validateAccessTokenPayload(payload);
            client["user"] = user;
            return true;
        } catch (err) {                                
            const message = err instanceof Error ? err.message : "unknown";
            this.logger.error(`WS Auth Error: ${message}`);
            throw new WsException("Unauthorized");
        }
    }

    private extractToken(client: Socket) {
        const auth = client.handshake.auth as Record<string, unknown> | undefined;
        const query = client.handshake.query as Record<string, unknown> | undefined;
        const headerAuthorization = client.handshake.headers?.authorization;

        const candidates = [
            this.toStringValue(auth?.token),
            this.toStringValue(auth?.accessToken),
            this.toStringValue(auth?.access_token),
            this.toStringValue(headerAuthorization),
            this.toStringValue(query?.token),
            this.toStringValue(query?.accessToken),
            this.toStringValue(query?.access_token)
        ];

        const rawToken = candidates.find((item) => Boolean(item && item.trim().length > 0));
        if (!rawToken) return null;

        const normalized = rawToken.trim();
        if (normalized.toLowerCase().startsWith("bearer ")) {
            return normalized.slice(7).trim();
        }

        return normalized;
    }

    private toStringValue(value: unknown) {
        if (typeof value === "string") return value;
        if (Array.isArray(value) && value.length > 0 && typeof value[0] === "string") {
            return value[0];
        }
        return null;
    }
}
