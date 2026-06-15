import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ExecutionContext } from "@nestjs/common";
import { UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "src/common/decorators/customize";
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
    constructor(private reflector: Reflector) {
        super();
    }
    canActivate(context: ExecutionContext) {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass()
        ]);
        if (isPublic) {
            return true;
        }
        return super.canActivate(context);
    }
    //custom mesage error
    handleRequest(err, user, info, context) {
        if (err || !user) {
            console.log("JwtAuthGuard Error:", err);
            console.log("JwtAuthGuard User:", user);
            console.log("JwtAuthGuard Info:", info); // Specific error from passport-jwt
            const base = {
                statusCode: 401,
                error: "Unauthorized"
            };
            const infoName = info?.name;
            const infoMessage = info?.message;

            if (infoName === "TokenExpiredError" || infoMessage === "jwt expired") {
                throw new UnauthorizedException({
                    ...base,
                    code: "TOKEN_EXPIRED",
                    message: "Access token expired"
                });
            }

            if (infoName === "JsonWebTokenError") {
                throw new UnauthorizedException({
                    ...base,
                    code: "TOKEN_INVALID",
                    message: "Invalid access token"
                });
            }

            if (infoName === "NotBeforeError") {
                throw new UnauthorizedException({
                    ...base,
                    code: "TOKEN_NOT_ACTIVE",
                    message: "Access token not active"
                });
            }

            throw err || new UnauthorizedException({
                ...base,
                code: "TOKEN_MISSING_OR_INVALID",
                message: "Access token missing or invalid"
            });
        }
        return user;
    }
}

