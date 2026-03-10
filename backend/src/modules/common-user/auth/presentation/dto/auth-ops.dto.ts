import { IsNotEmpty, IsOptional, IsString } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";

export class SocialLoginDto {
    @ApiProperty({
        description: "Google ID token from mobile/web SDK",
        example:
            "eyJhbGciOiJSUzI1NiIsImtpZCI6Ij... (idToken from Google Sign-In SDK)"
    })
    @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
    @IsString()
    @IsNotEmpty()
    idToken: string;
}

export class RefreshTokenDto {
    @ApiPropertyOptional({
        description: "Optional refresh token. If omitted, backend will read refresh_token cookie",
        example: "d2d1d4a1f4b8..."
    })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    refreshToken?: string;
}

export class AuthUserResponseDto {
    @ApiProperty({
        description: "User id",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
    })
    id: string;

    @ApiProperty({
        description: "Unique 6-digit account code for pairing",
        example: "123456",
        nullable: true
    })
    accountCode: string | null;

    @ApiProperty({
        description: "Social subject id (Google/Apple sub). Null for local account.",
        example: "103394857349857349857",
        nullable: true
    })
    sub: string | null;

    @ApiProperty({
        description: "User email",
        example: "mobile.user@example.com"
    })
    email: string;

    @ApiProperty({
        description: "Display name",
        example: "Mobile User"
    })
    fullName: string | null;

    @ApiProperty({
        description: "User gender code: 0=MALE, 1=FEMALE, 2=OTHER",
        type: Number,
        enum: [0, 1, 2],
        example: 1,
        nullable: true
    })
    gender: 0 | 1 | 2 | null;

    @ApiProperty({
        description: "Avatar URL",
        example: "https://cdn.example.com/avatars/me.jpg",
        nullable: true
    })
    avatar: string | null;

    @ApiProperty({
        description: "Birth date (YYYY-MM-DD)",
        example: "2001-05-07",
        nullable: true
    })
    birthDate: string | null;

    @ApiProperty({
        description: "User role",
        example: "USER"
    })
    role: string;
}

export class AuthTokensResponseDto {
    @ApiProperty({
        description: "JWT access token (send in Authorization header as Bearer token)",
        example:
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    })
    access_token: string;

    @ApiProperty({
        description: "Refresh token for rotating session",
        example: "8cc2c3f0f6496f1910d6fe3f2c0de9f4..."
    })
    refresh_token: string;
}

export class AuthSessionMetaResponseDto {
    @ApiProperty({
        description: "True when account was just created in this login flow",
        example: false
    })
    isNewUser: boolean;

    @ApiProperty({
        description: "True when app should redirect user to profile setup screen",
        example: true
    })
    needsProfileSetup: boolean;
}

export class AuthProfilePayloadResponseDto {
    @ApiProperty({
        description: "JWT subject (user id)",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
    })
    sub: string;

    @ApiProperty({
        description: "User id",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
    })
    id: string;

    @ApiProperty({
        description: "Backward-compatible user id field",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
    })
    user_Id: string;

    @ApiProperty({
        description: "User email",
        example: "mobile.user@example.com"
    })
    email: string;

    @ApiProperty({
        description: "Display name",
        example: "Mobile User",
        nullable: true
    })
    fullName: string | null;

    @ApiProperty({
        description: "User role",
        example: "USER"
    })
    role: string;
}

export class AuthSessionResponseDto {
    @ApiProperty({ type: AuthUserResponseDto })
    user: AuthUserResponseDto;

    @ApiProperty({ type: AuthTokensResponseDto })
    tokens: AuthTokensResponseDto;

    @ApiProperty({ type: () => AuthSessionMetaResponseDto })
    meta: AuthSessionMetaResponseDto;
}

export class MobileGoogleAuthResponseDto {
    @ApiProperty({ type: AuthUserResponseDto })
    user: AuthUserResponseDto;

    @ApiProperty({ type: () => AuthSessionMetaResponseDto })
    meta: AuthSessionMetaResponseDto;
}

export class LogoutResponseDto {
    @ApiProperty({
        description: "Logout result",
        example: true
    })
    success: boolean;
}
