import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { PUSH_TOKEN_PLATFORMS, type PushTokenPlatform } from "../../../notifications/domain/entities/push-token.entity";

const pickTokenValue = (value: unknown, obj: Record<string, unknown> | undefined) => {
    if (typeof value === "string") return value;
    if (!obj) return value;
    const candidates = [obj.fcmToken, obj.fcm_token, obj.token, obj.idDevice, obj.iddevice];
    const first = candidates.find((item) => typeof item === "string");
    return first ?? value;
};

const normalizeTokenValue = (value: unknown, obj: Record<string, unknown> | undefined) => {
    const raw = pickTokenValue(value, obj);
    return typeof raw === "string" ? raw.trim() : raw;
};

const normalizePlatformValue = (value: unknown) => {
    return typeof value === "string" ? value.trim().toLowerCase() : value;
};

const normalizeOptionalString = (value: unknown) => {
    return typeof value === "string" ? value.trim() : value;
};

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

    @ApiPropertyOptional({
        description: "FCM token from mobile app. Backend will save it right after Google login.",
        example:
            "ePuSzfxwSVSnCcMk1X4-qZ:APA91bEDweT7e1A5oDfZGPoMz3SWFRhcV6OqglwdL5gcvevEOgtLe1_WAynxv3tBsD282ONs_C2tL4VcNlBpmC43fzE3ZRd_POrq4nS_z_K7XaAh_AYj1hA"
    })
    @Transform(({ value, obj }) => normalizeTokenValue(value, obj))
    @IsOptional()
    @IsString()
    @MinLength(20)
    @MaxLength(4096)
    fcmToken?: string;

    @ApiPropertyOptional({
        description: "Legacy alias for fcmToken.",
        example:
            "ePuSzfxwSVSnCcMk1X4-qZ:APA91bEDweT7e1A5oDfZGPoMz3SWFRhcV6OqglwdL5gcvevEOgtLe1_WAynxv3tBsD282ONs_C2tL4VcNlBpmC43fzE3ZRd_POrq4nS_z_K7XaAh_AYj1hA"
    })
    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    @MinLength(20)
    @MaxLength(4096)
    fcm_token?: string;

    @ApiPropertyOptional({
        description: "Legacy alias for fcmToken.",
        example:
            "ePuSzfxwSVSnCcMk1X4-qZ:APA91bEDweT7e1A5oDfZGPoMz3SWFRhcV6OqglwdL5gcvevEOgtLe1_WAynxv3tBsD282ONs_C2tL4VcNlBpmC43fzE3ZRd_POrq4nS_z_K7XaAh_AYj1hA"
    })
    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    @MinLength(20)
    @MaxLength(4096)
    token?: string;

    @ApiPropertyOptional({
        description: "Legacy alias for fcmToken.",
        example:
            "ePuSzfxwSVSnCcMk1X4-qZ:APA91bEDweT7e1A5oDfZGPoMz3SWFRhcV6OqglwdL5gcvevEOgtLe1_WAynxv3tBsD282ONs_C2tL4VcNlBpmC43fzE3ZRd_POrq4nS_z_K7XaAh_AYj1hA"
    })
    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    @MinLength(20)
    @MaxLength(4096)
    idDevice?: string;

    @ApiPropertyOptional({
        description: "Legacy alias for fcmToken.",
        example:
            "ePuSzfxwSVSnCcMk1X4-qZ:APA91bEDweT7e1A5oDfZGPoMz3SWFRhcV6OqglwdL5gcvevEOgtLe1_WAynxv3tBsD282ONs_C2tL4VcNlBpmC43fzE3ZRd_POrq4nS_z_K7XaAh_AYj1hA"
    })
    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    @MinLength(20)
    @MaxLength(4096)
    iddevice?: string;

    @ApiPropertyOptional({
        description: "Device platform that owns this FCM token.",
        enum: PUSH_TOKEN_PLATFORMS,
        example: "android",
        default: "android"
    })
    @IsOptional()
    @Transform(({ value }) => normalizePlatformValue(value))
    @IsIn(PUSH_TOKEN_PLATFORMS)
    platform?: PushTokenPlatform;
}

export class RegisterFcmTokenDto {
    @ApiPropertyOptional({
        description: "FCM token of current device.",
        example:
            "ePuSzfxwSVSnCcMk1X4-qZ:APA91bEDweT7e1A5oDfZGPoMz3SWFRhcV6OqglwdL5gcvevEOgtLe1_WAynxv3tBsD282ONs_C2tL4VcNlBpmC43fzE3ZRd_POrq4nS_z_K7XaAh_AYj1hA"
    })
    @Transform(({ value, obj }) => normalizeTokenValue(value, obj))
    @IsOptional()
    @IsString()
    @MinLength(20)
    @MaxLength(4096)
    fcmToken?: string;

    @ApiPropertyOptional({
        description: "Legacy alias for fcmToken.",
        example:
            "ePuSzfxwSVSnCcMk1X4-qZ:APA91bEDweT7e1A5oDfZGPoMz3SWFRhcV6OqglwdL5gcvevEOgtLe1_WAynxv3tBsD282ONs_C2tL4VcNlBpmC43fzE3ZRd_POrq4nS_z_K7XaAh_AYj1hA"
    })
    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    @MinLength(20)
    @MaxLength(4096)
    fcm_token?: string;

    @ApiPropertyOptional({
        description: "Legacy alias for fcmToken.",
        example:
            "ePuSzfxwSVSnCcMk1X4-qZ:APA91bEDweT7e1A5oDfZGPoMz3SWFRhcV6OqglwdL5gcvevEOgtLe1_WAynxv3tBsD282ONs_C2tL4VcNlBpmC43fzE3ZRd_POrq4nS_z_K7XaAh_AYj1hA"
    })
    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    @MinLength(20)
    @MaxLength(4096)
    token?: string;

    @ApiPropertyOptional({
        description: "Legacy alias for fcmToken.",
        example:
            "ePuSzfxwSVSnCcMk1X4-qZ:APA91bEDweT7e1A5oDfZGPoMz3SWFRhcV6OqglwdL5gcvevEOgtLe1_WAynxv3tBsD282ONs_C2tL4VcNlBpmC43fzE3ZRd_POrq4nS_z_K7XaAh_AYj1hA"
    })
    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    @MinLength(20)
    @MaxLength(4096)
    idDevice?: string;

    @ApiPropertyOptional({
        description: "Legacy alias for fcmToken.",
        example:
            "ePuSzfxwSVSnCcMk1X4-qZ:APA91bEDweT7e1A5oDfZGPoMz3SWFRhcV6OqglwdL5gcvevEOgtLe1_WAynxv3tBsD282ONs_C2tL4VcNlBpmC43fzE3ZRd_POrq4nS_z_K7XaAh_AYj1hA"
    })
    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    @MinLength(20)
    @MaxLength(4096)
    iddevice?: string;

    @ApiPropertyOptional({
        description: "Device platform that owns this FCM token.",
        enum: PUSH_TOKEN_PLATFORMS,
        example: "android",
        default: "android"
    })
    @IsOptional()
    @Transform(({ value }) => normalizePlatformValue(value))
    @IsIn(PUSH_TOKEN_PLATFORMS)
    platform?: PushTokenPlatform;
}

export class FcmTokenBodyDto {
    @ApiPropertyOptional({
        description: "FCM token of current device.",
        example:
            "ePuSzfxwSVSnCcMk1X4-qZ:APA91bEDweT7e1A5oDfZGPoMz3SWFRhcV6OqglwdL5gcvevEOgtLe1_WAynxv3tBsD282ONs_C2tL4VcNlBpmC43fzE3ZRd_POrq4nS_z_K7XaAh_AYj1hA"
    })
    @Transform(({ value, obj }) => normalizeTokenValue(value, obj))
    @IsOptional()
    @IsString()
    @MinLength(20)
    @MaxLength(4096)
    fcmToken?: string;

    @ApiPropertyOptional({
        description: "Legacy alias for fcmToken.",
        example:
            "ePuSzfxwSVSnCcMk1X4-qZ:APA91bEDweT7e1A5oDfZGPoMz3SWFRhcV6OqglwdL5gcvevEOgtLe1_WAynxv3tBsD282ONs_C2tL4VcNlBpmC43fzE3ZRd_POrq4nS_z_K7XaAh_AYj1hA"
    })
    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    @MinLength(20)
    @MaxLength(4096)
    fcm_token?: string;

    @ApiPropertyOptional({
        description: "Legacy alias for fcmToken.",
        example:
            "ePuSzfxwSVSnCcMk1X4-qZ:APA91bEDweT7e1A5oDfZGPoMz3SWFRhcV6OqglwdL5gcvevEOgtLe1_WAynxv3tBsD282ONs_C2tL4VcNlBpmC43fzE3ZRd_POrq4nS_z_K7XaAh_AYj1hA"
    })
    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    @MinLength(20)
    @MaxLength(4096)
    token?: string;

    @ApiPropertyOptional({
        description: "Legacy alias for fcmToken.",
        example:
            "ePuSzfxwSVSnCcMk1X4-qZ:APA91bEDweT7e1A5oDfZGPoMz3SWFRhcV6OqglwdL5gcvevEOgtLe1_WAynxv3tBsD282ONs_C2tL4VcNlBpmC43fzE3ZRd_POrq4nS_z_K7XaAh_AYj1hA"
    })
    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    @MinLength(20)
    @MaxLength(4096)
    idDevice?: string;

    @ApiPropertyOptional({
        description: "Legacy alias for fcmToken.",
        example:
            "ePuSzfxwSVSnCcMk1X4-qZ:APA91bEDweT7e1A5oDfZGPoMz3SWFRhcV6OqglwdL5gcvevEOgtLe1_WAynxv3tBsD282ONs_C2tL4VcNlBpmC43fzE3ZRd_POrq4nS_z_K7XaAh_AYj1hA"
    })
    @Transform(({ value }) => normalizeOptionalString(value))
    @IsOptional()
    @IsString()
    @MinLength(20)
    @MaxLength(4096)
    iddevice?: string;
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

    @ApiPropertyOptional({
        description: "Saved push-device identifier in backend (created/updated from FCM token).",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8",
        nullable: true
    })
    deviceId?: string | null;

    @ApiPropertyOptional({
        description: "Alias of deviceId for mobile compatibility.",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8",
        nullable: true
    })
    idDevice?: string | null;

    @ApiPropertyOptional({
        description: "Legacy alias of deviceId for backward compatibility.",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8",
        nullable: true
    })
    iddevice?: string | null;
}

export class MobileGoogleAuthResponseDto {
    @ApiProperty({ type: AuthUserResponseDto })
    user: AuthUserResponseDto;

    @ApiProperty({ type: () => AuthSessionMetaResponseDto })
    meta: AuthSessionMetaResponseDto;
}

export class FcmTokenRegisterResponseDto {
    @ApiProperty({
        description: "Register/update FCM token result",
        example: true
    })
    success: boolean;

    @ApiPropertyOptional({
        description: "Saved push-device identifier in backend",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8",
        nullable: true
    })
    deviceId?: string | null;

    @ApiPropertyOptional({
        description: "Alias of deviceId for mobile compatibility",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8",
        nullable: true
    })
    idDevice?: string | null;

    @ApiPropertyOptional({
        description: "Legacy alias of deviceId for backward compatibility",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8",
        nullable: true
    })
    iddevice?: string | null;
}

export class LogoutResponseDto {
    @ApiProperty({
        description: "Logout result",
        example: true
    })
    success: boolean;
}
