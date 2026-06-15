import { IsBoolean, IsIn, IsOptional, IsString } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

const THEMES = ["light", "dark", "system"] as const;
const PRIVACY_LEVELS = ["public", "friends", "private"] as const;

export class UpdateSettingsDto {
    @ApiPropertyOptional({
        description: "Enable or disable push/in-app notifications",
        example: true
    })
    @IsOptional()
    @IsBoolean()
    notificationEnabled?: boolean;

    @ApiPropertyOptional({
        description: "App theme",
        enum: THEMES,
        example: "system"
    })
    @IsOptional()
    @IsString()
    @IsIn(THEMES)
    theme?: string;

    @ApiPropertyOptional({
        description: "Privacy level",
        enum: PRIVACY_LEVELS,
        example: "friends"
    })
    @IsOptional()
    @IsString()
    @IsIn(PRIVACY_LEVELS)
    privacy?: string;
}
