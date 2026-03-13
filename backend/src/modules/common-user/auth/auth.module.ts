import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthService } from "./application/auth.service";
import { AuthController } from "./presentation/auth.controller";
import { UserModule } from "../user/user.module";
import { JwtStrategy } from "./infrastructure/strategies/jwt.strategy";
import { GoogleStrategy } from "./infrastructure/strategies/google.strategy";
import { GoogleAuthGuard } from "./infrastructure/strategies/google-auth.guard";
import { WsJwtGuard } from "./infrastructure/strategies/ws-jwt.guard";
import { PushTokenRepository } from "../notifications/infrastructure/persistence/push-token.repository";

@Module({
    imports: [
        UserModule,
        PassportModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get<string>("JWT_SECRET") || "secretKey",
                signOptions: {
                    expiresIn:
                        (configService.get<string>("JWT_EXPIRES_IN") ||
                            configService.get<string>("JWT_EXPIRATION") ||
                            "1d") as any
                }
            })
        })
    ],
    providers: [AuthService, JwtStrategy, GoogleStrategy, GoogleAuthGuard, WsJwtGuard, PushTokenRepository],
    controllers: [AuthController],
    exports: [AuthService, JwtModule, WsJwtGuard]
})
export class AuthModule {}
