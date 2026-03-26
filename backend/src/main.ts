import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { IoAdapter } from "@nestjs/platform-socket.io";
import { existsSync, mkdirSync } from "fs";
import { join, resolve } from "path";
import * as session from "express-session";
import { AppModule } from "./app.module";
import { Logger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import * as cookieParser from "cookie-parser";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";

async function bootstrap() {
    const logger = new Logger("Bootstrap");
    const app = await NestFactory.create<NestExpressApplication>(AppModule);
    const configService = app.get(ConfigService);
    const port = configService.get("PORT") || 3000;
    const useHttps = String(configService.get("USE_HTTPS") || "").toLowerCase() === "true";
    const uploadPath = configService.get<string>("UPLOAD_PATH") || "./uploads";
    const uploadRoot = resolve(process.cwd(), uploadPath);
    const redisUrl = configService.get<string>("REDIS_URL");
    const redisHost = configService.get<string>("REDIS_HOST");
    const redisPort = configService.get<string>("REDIS_PORT");
    const redisPassword = configService.get<string>("REDIS_PASSWORD");
    const redisEnabled = String(configService.get<string>("REDIS_ENABLED") || "").toLowerCase() === "true";

    app.useStaticAssets(join(__dirname, "..", "public"));
    if (!existsSync(uploadRoot)) {
        mkdirSync(uploadRoot, { recursive: true });
    }
    app.useStaticAssets(uploadRoot, {
        prefix: "/uploads",
        maxAge: "365d",
        immutable: true,
        etag: true,
        lastModified: true,
        setHeaders: (res) => {
            // Upload object keys are unique (timestamp + random), so immutable cache is safe.
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
    });

    app.use(cookieParser());

    // Enable global validation pipe
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            transform: true,
            transformOptions: { enableImplicitConversion: true }
        })
    );

    // Enable CORS
    app.enableCors({
        origin: true,
        methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
        credentials: true
    });
    // Security headers using Helmet
    app.use(
        helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: [`'self'`],
                    styleSrc: [`'self'`, `'unsafe-inline'`],
                    scriptSrc: [`'self'`, `'unsafe-inline'`, `https://cdn.jsdelivr.net`],
                    imgSrc: [
                        `'self'`,
                        `data:`,
                        `https://cdn.jsdelivr.net`,
                        `https://tile.openstreetmap.org`,
                        `https://*.tile.openstreetmap.org`
                    ],
                    // Keep Swagger UI working on plain HTTP deployments (IP:port) without forced HTTPS upgrades.
                    upgradeInsecureRequests: useHttps ? [] : null
                }
            },
            hsts: useHttps,
            crossOriginEmbedderPolicy: false
        })
    );
    app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
    // Add session middleware for Passport OAuth
    app.use(
        session({
            secret: process.env.JWT_SECRET || "my-secret",
            resave: false,
            saveUninitialized: false,
            cookie: { maxAge: 3600000 }
        })
    );

    // Setup Swagger
    const config = new DocumentBuilder()
        .setTitle("Dating App API")
        .setDescription(
            [
                "Mobile quick start (Auth):",
                "1) Use POST /auth/google with { idToken, fcmToken, platform } from mobile SDK.",
                "2) Copy tokens.access_token and click Authorize with: Bearer <access_token>.",
                "3) Call GET /auth/profile to verify auth.",
                "4) Use POST /auth/refresh when access token expires.",
                "5) Use POST /auth/logout to end session.",
                "",
                "Mobile quick start (Profile):",
                "- GET /profile",
                "- PATCH /profile",
                "- PATCH /profile/location",
                "- DELETE /profile",
                "",
                "Mobile quick start (Notification realtime):",
                "1) Connect socket.io to backend root namespace (/).",
                "2) Send access token in auth.token (or auth.accessToken/query/header Authorization).",
                "3) Emit notification:join, then listen notification:new and notification:read.",
                "4) Use GET /notifications and PATCH /notifications/:id/read for list/read state.",
                "",
                "Mobile quick start (FCM push token):",
                "1) FCM token is now saved in POST /auth/google payload.",
                "2) On token refresh, call POST /auth/fcm-token/register with { fcmToken, platform }.",
                "3) On logout/uninstall, call POST /auth/fcm-token/unregister with { fcmToken }."
            ].join("\n")
        )
        .setVersion("1.0")
        .addBearerAuth(
            {
                type: "http",
                scheme: "bearer",
                bearerFormat: "JWT",
                name: "JWT",
                description: "Enter JWT token",
                in: "header"
            },
            "JWT-auth" // This name here is important for matching up with @ApiBearerAuth() in your controller!
        )
        // .addSecurityRequirements('JWT-auth') // Removed global security to handle it manually
        .build();
    const document = SwaggerModule.createDocument(app, config, {
        operationIdFactory: (_controllerKey: string, methodKey: string) => methodKey
    });
    SwaggerModule.setup("api/docs", app, document, {
        jsonDocumentUrl: "api/docs-json",
        swaggerOptions: {
            url: "/api/docs-json",
            persistAuthorization: true
        }
    });

    if (redisEnabled || redisUrl) {
        const pubClient = redisUrl
            ? createClient({ url: redisUrl })
            : createClient({
                  socket: {
                      host: redisHost || "127.0.0.1",
                      port: redisPort ? Number(redisPort) : 6379
                  },
                  password: redisPassword || undefined
              });
        const subClient = pubClient.duplicate();

        try {
            await Promise.all([pubClient.connect(), subClient.connect()]);

            class RedisIoAdapter extends IoAdapter {
                createIOServer(portNumber: number, options?: Record<string, unknown>) {
                    const server = super.createIOServer(portNumber, options);
                    server.adapter(createAdapter(pubClient, subClient));
                    return server;
                }
            }

            app.useWebSocketAdapter(new RedisIoAdapter(app));
            logger.log("Socket.IO Redis adapter enabled.");
        } catch (error) {
            await Promise.all([pubClient.quit().catch(() => null), subClient.quit().catch(() => null)]);
        }
    }

    // app.setGlobalPrefix('api');
    await app.listen(port);
    console.log(`Application is running on: http://localhost:${port}`);
    console.log(`Swagger documentation is available at: http://localhost:${port}/api/docs`);
}
bootstrap();
