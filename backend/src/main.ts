import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { existsSync, mkdirSync } from "fs";
import { join, resolve } from "path";
import * as session from "express-session";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import * as cookieParser from "cookie-parser";

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);
    const configService = app.get(ConfigService);
    const port = configService.get("PORT") || 3000;
    const useHttps = String(configService.get("USE_HTTPS") || "").toLowerCase() === "true";
    const uploadPath = configService.get<string>("UPLOAD_PATH") || "./uploads";
    const uploadRoot = resolve(process.cwd(), uploadPath);

    app.useStaticAssets(join(__dirname, "..", "public"));
    if (!existsSync(uploadRoot)) {
        mkdirSync(uploadRoot, { recursive: true });
    }
    app.useStaticAssets(uploadRoot, { prefix: "/uploads" });

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
                "1) Use POST /auth/google with a real Google idToken from mobile SDK.",
                "2) Copy tokens.access_token and click Authorize with: Bearer <access_token>.",
                "3) Call GET /auth/profile to verify auth.",
                "4) Use POST /auth/refresh when access token expires.",
                "5) Use POST /auth/logout to end session."
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
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("api/docs", app, document, {
        jsonDocumentUrl: "api/docs-json",
        swaggerOptions: {
            url: "/api/docs-json",
            persistAuthorization: true
        }
    });

    // app.setGlobalPrefix('api');
    await app.listen(port);
    console.log(`Application is running on: http://localhost:${port}`);
    console.log(`Swagger documentation is available at: http://localhost:${port}/api/docs`);
}
bootstrap();
