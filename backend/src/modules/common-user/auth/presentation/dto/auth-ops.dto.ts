import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class SocialLoginDto {
    @IsString()
    @IsNotEmpty()
    idToken: string;
}

export class RefreshTokenDto {
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    refreshToken?: string;
}
