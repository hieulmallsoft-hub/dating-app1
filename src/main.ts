import { NestFactory } from '@nestjs/core';
import * as session from 'express-session';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  // Enable global validation pipe
  app.useGlobalPipes(new ValidationPipe());

  // Enable CORS
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
  // Security headers using Helmet
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: [`'self'`],
          styleSrc: [`'self'`, `'unsafe-inline'`],
          scriptSrc: [`'self'`, `'unsafe-inline'`, `https://cdn.jsdelivr.net`],
          imgSrc: [`'self'`, `data:`, `https://cdn.jsdelivr.net`],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
  // Add session middleware for Passport OAuth
  app.use(
    session({
      secret: process.env.JWT_SECRET || 'my-secret',
      resave: false,
      saveUninitialized: false,
      cookie: { maxAge: 3600000 },
    }),
  );

  // Setup Swagger
  const config = new DocumentBuilder()
    .setTitle('Dating App API')
    .setDescription('The dating app API description')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth', // This name here is important for matching up with @ApiBearerAuth() in your controller!
    )
    // .addSecurityRequirements('JWT-auth') // Removed global security to handle it manually
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // app.setGlobalPrefix('api');
  await app.listen(process.env.PORT || 3000);
}
bootstrap();
