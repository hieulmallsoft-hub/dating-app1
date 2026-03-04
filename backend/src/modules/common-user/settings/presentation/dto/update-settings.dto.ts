import { IsBoolean, IsIn, IsOptional, IsString } from "class-validator";

const THEMES = ["light", "dark", "system"] as const;
const PRIVACY_LEVELS = ["public", "friends", "private"] as const;

export class UpdateSettingsDto {
    @IsOptional()
    @IsBoolean()
    notificationEnabled?: boolean;

    @IsOptional()
    @IsString()
    @IsIn(THEMES)
    theme?: string;

    @IsOptional()
    @IsString()
    @IsIn(PRIVACY_LEVELS)
    privacy?: string;
}
