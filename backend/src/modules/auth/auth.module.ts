import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthService } from "./application/auth.service";
import { AuthController } from "./presentation/auth.controller";
import { UserModule } from "../user/user.module";
import { JwtStrategy } from "./infrastructure/strategies/jwt.strategy";
import { GoogleStrategy } from "./infrastructure/strategies/google.strategy";
import { AppleStrategy } from "./infrastructure/strategies/apple.strategy";

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
                    expiresIn: (configService.get<string>("JWT_EXPIRES_IN") || "1d") as any
                }
            })
        })
    ],
    providers: [AuthService, JwtStrategy, GoogleStrategy, AppleStrategy],
    controllers: [AuthController],
    exports: [AuthService]
})
export class AuthModule {}
