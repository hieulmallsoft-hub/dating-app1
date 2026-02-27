import {
    BadGatewayException,
    ExecutionContext,
    Injectable,
    Logger,
    ServiceUnavailableException,
    UnauthorizedException
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class GoogleAuthGuard extends AuthGuard("google") {
    private readonly logger = new Logger(GoogleAuthGuard.name);

    constructor(private readonly configService: ConfigService) {
        super();
    }

    canActivate(context: ExecutionContext) {
        const clientId = this.configService.get<string>("auth.google.clientId")?.trim();
        const clientSecret = this.configService.get<string>("auth.google.clientSecret")?.trim();

        if (!clientId || !clientSecret) {
            throw new ServiceUnavailableException(
                "Google OAuth is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to the backend env."
            );
        }

        return super.canActivate(context);
    }

    getAuthenticateOptions() {
        return {
            session: false
        };
    }

    handleRequest<TUser = unknown>(
        err: unknown,
        user: TUser,
        info: { message?: string } | undefined,
        context: ExecutionContext,
        status?: unknown
    ): TUser {
        if (err || !user) {
            const details = info?.message || (err as { message?: string } | undefined)?.message || "Unknown Google OAuth error";

            this.logger.error(`Google OAuth failed: ${details}`);

            if (/invalid[_\s-]?client/i.test(details)) {
                throw new ServiceUnavailableException(
                    "Google OAuth client credentials are invalid. Check GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET."
                );
            }

            if (/Failed to obtain access token|invalid[_\s-]?grant/i.test(details)) {
                throw new UnauthorizedException(
                    "Google OAuth callback failed. Check GOOGLE_CLIENT_SECRET and the authorized redirect URI."
                );
            }

            throw new BadGatewayException(`Google OAuth failed: ${details}`);
        }

        return user;
    }
}
