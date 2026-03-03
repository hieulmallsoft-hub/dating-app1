import { Module, OnModuleInit, Logger, NestModule, MiddlewareConsumer } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { UserModule } from "./modules/common-user/user/user.module";
import { AuthModule } from "./modules/common-user/auth/auth.module";
import databaseConfig from "./config/database.config";
import jwtConfig from "./config/jwt.config";
import appConfig from "./config/app.config";
import authConfig from "./config/auth.config";
import { HttpLoggerMiddleware } from "./common/middleware/http-logger.middleware";
import { APP_GUARD } from "@nestjs/core";
import { JwtAuthGuard } from "./modules/common-user/auth/infrastructure/strategies/jwt-auth-guard";
import { CoupleModule } from "./modules/couple-features/couple/couple.module";
import { MomentsModule } from "./modules/couple-features/moments/moments.module";
import { MediaModule } from "./modules/couple-features/media/media.module";
import { UploadsModule } from "./modules/common-user/uploads/uploads.module";
import { ChatModule } from "./modules/couple-features/chat/chat.module";
import { PlacesModule } from "./modules/couple-features/places/places.module";
import { EventsModule } from "./modules/couple-features/events/events.module";
import { NotificationsModule } from "./modules/common-user/notifications/notifications.module";
import { SettingsModule } from "./modules/common-user/settings/settings.module";
import { SecurityModule } from "./modules/common-user/security/security.module";
@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: "src/env/.env",
            load: [databaseConfig, jwtConfig, appConfig, authConfig]
        }),
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                ...configService.get("database"),
                autoLoadEntities: true
            }),
            inject: [ConfigService]
        }),
        UserModule,
        AuthModule,
        CoupleModule,
        MomentsModule,
        MediaModule,
        UploadsModule,
        ChatModule,
        PlacesModule,
        EventsModule,
        NotificationsModule,
        SettingsModule,
        SecurityModule
    ],
    controllers: [AppController],
    providers: [
        AppService,
        // bảo vệ các chức năng sử dụng token
        {
            provide: APP_GUARD,
            useClass: JwtAuthGuard
        }
    ]
})
export class AppModule implements OnModuleInit {
    constructor(private dataSource: DataSource) {}

    onModuleInit() {
        if (this.dataSource.isInitialized) {
            Logger.log("Database connected successfully", "AppModule");
        } else {
            Logger.error("Database connection failed", "AppModule");
        }
    }

    configure(consumer: MiddlewareConsumer) {
        consumer.apply(HttpLoggerMiddleware).forRoutes("*");
    }
}

