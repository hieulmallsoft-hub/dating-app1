import { Module, OnModuleInit, Logger, NestModule, MiddlewareConsumer } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { UserModule } from "./modules/user/user.module";
import { AuthModule } from "./modules/auth/auth.module";
import { AdminModule } from "./modules/admin/admin.module";
import databaseConfig from "./config/database.config";
import jwtConfig from "./config/jwt.config";
import appConfig from "./config/app.config";
import authConfig from "./config/auth.config";
import { HttpLoggerMiddleware } from "./common/middleware/http-logger.middleware";
import { APP_GUARD } from "@nestjs/core";
import { JwtAuthGuard } from "./modules/auth/infrastructure/strategies/jwt-auth-guard";
import { CoupleModule } from "./modules/couple/couple.module";
import { InvitesModule } from "./modules/invites/invites.module";
import { MomentsModule } from "./modules/moments/moments.module";
import { MediaModule } from "./modules/media/media.module";
import { UploadsModule } from "./modules/uploads/uploads.module";
import { ChatModule } from "./modules/chat/chat.module";
import { PlacesModule } from "./modules/places/places.module";
import { EventsModule } from "./modules/events/events.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { SettingsModule } from "./modules/settings/settings.module";
import { SecurityModule } from "./modules/security/security.module";
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
        AdminModule,
        CoupleModule,
        InvitesModule,
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
