import { IsString, IsNotEmpty, IsOptional, IsDateString } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class JoinCoupleDto {
    @ApiProperty({
        description: "Invite code from partner",
        example: "A1B2C3D4"
    })
    @IsString()
    @IsNotEmpty()
    inviteCode: string;
}

export class UpdateCoupleDto {
    @ApiPropertyOptional({
        description: "Couple start date (ISO-8601)",
        example: "2026-03-09T00:00:00.000Z"
    })
    @IsDateString()
    @IsOptional()
    startDate?: string;

    @ApiPropertyOptional({
        description: "Theme name for couple profile",
        example: "sunset"
    })
    @IsString()
    @IsOptional()
    theme?: string;
}
