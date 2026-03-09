# SWAGGER_PROJECT_TEMPLATE

Tai lieu mau de ap dung Swagger cho du an NestJS theo kieu:
- Mobile/FE vao Swagger la thay ro API lam gi
- Biet can gi trong `param`, `query`, `body`
- Co example request/response
- Co ma loi thuong gap

Cap nhat mau: 2026-03-09

## 1. Setup Swagger trong `main.ts`

```ts
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

const config = new DocumentBuilder()
  .setTitle("My API")
  .setDescription(
    [
      "Quick start:",
      "1) Dang nhap lay access token",
      "2) Bam Authorize va paste: Bearer <access_token>",
      "3) Test cac API can auth"
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
    "JWT-auth"
  )
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup("api/docs", app, document, {
  swaggerOptions: { persistAuthorization: true }
});
```

## 2. DTO request mau

```ts
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from "class-validator";

export class LoginDto {
  @ApiProperty({
    description: "Account email",
    example: "user@example.com"
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: "Account password",
    example: "123456"
  })
  @IsString()
  @MinLength(6)
  password: string;
}

export class RefreshDto {
  @ApiPropertyOptional({
    description: "Optional refresh token, co the lay tu cookie",
    example: "aabbccddeeff..."
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
```

## 3. DTO response mau

```ts
import { ApiProperty } from "@nestjs/swagger";

export class UserShortDto {
  @ApiProperty({ example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8" })
  id: string;

  @ApiProperty({ example: "user@example.com" })
  email: string;

  @ApiProperty({ example: "USER" })
  role: string;
}

export class TokensDto {
  @ApiProperty({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." })
  access_token: string;

  @ApiProperty({ example: "8cc2c3f0f6496f1910d6fe3f2c0de9f4..." })
  refresh_token: string;
}

export class SessionResponseDto {
  @ApiProperty({ type: UserShortDto })
  user: UserShortDto;

  @ApiProperty({ type: TokensDto })
  tokens: TokensDto;
}
```

## 4. Controller CRUD mau

```ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  Req,
  UseGuards
} from "@nestjs/common";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiParam,
  ApiBody,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CreateItemDto, UpdateItemDto } from "./dto/item.dto";

@ApiTags("items")
@ApiBearerAuth("JWT-auth")
@Controller("items")
@UseGuards(JwtAuthGuard)
export class ItemsController {
  @Get()
  @ApiOperation({
    summary: "List items",
    description: "Lay danh sach item co phan trang."
  })
  @ApiQuery({ name: "page", required: false, example: 1 })
  @ApiQuery({ name: "limit", required: false, example: 20 })
  @ApiOkResponse({ description: "List tra ve thanh cong" })
  @ApiUnauthorizedResponse({ description: "Token khong hop le" })
  list(@Query("page") page = 1, @Query("limit") limit = 20) {
    return { page, limit, data: [] };
  }

  @Post()
  @ApiOperation({
    summary: "Create item",
    description: "Tao item moi."
  })
  @ApiBody({
    type: CreateItemDto,
    examples: {
      sample: {
        summary: "Body mau",
        value: { name: "Sample item" }
      }
    }
  })
  @ApiCreatedResponse({ description: "Tao thanh cong" })
  @ApiBadRequestResponse({ description: "Sai validate body" })
  create(@Body() dto: CreateItemDto) {
    return dto;
  }

  @Get(":id")
  @ApiOperation({ summary: "Get item by id" })
  @ApiParam({ name: "id", example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8" })
  @ApiOkResponse({ description: "Lay chi tiet thanh cong" })
  @ApiNotFoundResponse({ description: "Khong tim thay item" })
  findOne(@Param("id") id: string) {
    return { id };
  }

  @Put(":id")
  @ApiOperation({ summary: "Update item" })
  @ApiParam({ name: "id", example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8" })
  @ApiOkResponse({ description: "Update thanh cong" })
  @ApiBadRequestResponse({ description: "Body khong hop le" })
  update(@Param("id") id: string, @Body() dto: UpdateItemDto) {
    return { id, ...dto };
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete item" })
  @ApiParam({ name: "id", example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8" })
  @ApiOkResponse({
    description: "Delete thanh cong",
    schema: {
      type: "object",
      properties: { success: { type: "boolean", example: true } }
    }
  })
  remove(@Param("id") id: string) {
    return { success: true, id };
  }
}
```

## 5. Endpoint public, hide endpoint, upload file

### 5.1 Public endpoint (khong can JWT)

```ts
@Public()
@Post("login")
@ApiOperation({ summary: "Login" })
@ApiOkResponse({ description: "Login thanh cong" })
login(@Body() dto: LoginDto) { ... }
```

### 5.2 Hide endpoint noi bo khoi Swagger

```ts
@ApiExcludeEndpoint()
@Get("internal/callback")
internalCallback() { ... }
```

### 5.3 Upload multipart/form-data

```ts
@Post("file")
@ApiConsumes("multipart/form-data")
@ApiBody({
  schema: {
    type: "object",
    properties: {
      file: { type: "string", format: "binary" }
    },
    required: ["file"]
  }
})
upload(@UploadedFile() file: any) { ... }
```

## 6. Checklist bat buoc cho moi API

1. Co `@ApiOperation` (summary + description ro nghiep vu).
2. Co docs input day du: `@ApiParam` / `@ApiQuery` / DTO body + example.
3. Co docs output: `@ApiOkResponse` hoac `@ApiCreatedResponse`.
4. Co docs loi chinh: `@ApiBadRequestResponse`, `@ApiUnauthorizedResponse`, `@ApiNotFoundResponse`, `@ApiConflictResponse`, `@ApiForbiddenResponse` (neu co).
5. Co `@ApiBearerAuth("JWT-auth")` cho endpoint can token.
6. Route noi bo/OAuth callback khong cho FE test thi `@ApiExcludeEndpoint()`.

## 7. Khuyen nghi quy uoc team

1. Moi controller phai co `@ApiTags("module-name")`.
2. Moi DTO input phai co `@ApiProperty`/`@ApiPropertyOptional`.
3. Moi module nen co it nhat 1 response DTO de FE nhin ra format ngay.
4. Swagger docs phai cap nhat cung luc voi business logic (khong de lech code).
