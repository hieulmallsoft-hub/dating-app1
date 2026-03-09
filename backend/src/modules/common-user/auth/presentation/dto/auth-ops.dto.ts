import { IsNotEmpty, IsOptional, IsString } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class SocialLoginDto {
    @ApiProperty({
        description: "Google ID token from mobile/web SDK",
        example:
            "eyJhbGciOiJSUzI1NiIsImtpZCI6Ij... (idToken from Google Sign-In SDK)"
    })
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
        description: "User gender",
        example: "FEMALE",
        nullable: true
    })
    gender: string | null;

    @ApiProperty({
        description: "Avatar URL",
        example: "https://cdn.example.com/avatars/me.jpg",
        nullable: true
    })
    avatar: string | null;

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

export class AuthSessionResponseDto {
    @ApiProperty({ type: AuthUserResponseDto })
    user: AuthUserResponseDto;

    @ApiProperty({ type: AuthTokensResponseDto })
    tokens: AuthTokensResponseDto;
}

export class LogoutResponseDto {
    @ApiProperty({
        description: "Logout result",
        example: true
    })
    success: boolean;
}
