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
            const authToken = client.handshake.auth?.token || client.handshake.headers?.authorization;

            if (!authToken) {
                throw new WsException("Unauthorized");
            }

            const token = authToken.split(" ")[1] || authToken;
            const payload = await this.jwtService.verifyAsync(token, {
                secret: this.configService.get("JWT_SECRET")
            });

            const user = await this.authService.validateAccessTokenPayload(payload);
            client["user"] = user;
            return true;
        } catch (err) {                                
            this.logger.error(`WS Auth Error: ${err.message}`);
            throw new WsException("Unauthorized");
        }
    }
}
