import { IsString, IsOptional, IsEnum, IsDate, MaxLength, IsArray, IsUrl } from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Gender, GenderPreference } from "../../domain/entities/users.enity";

export class UpdateUserDto {
    @ApiPropertyOptional({
        description: "Display name",
        example: "Mai Nguyen"
    })
    @IsString()
    @IsOptional()
    @MaxLength(15)
    fullName?: string;

    @ApiPropertyOptional({
        description: "Gender",
        enum: Gender,
        example: Gender.FEMALE
    })
    @IsEnum(Gender)
    @IsOptional()
    gender?: Gender;

    @ApiPropertyOptional({
        description: "Birth date",
        example: "2000-01-01T00:00:00.000Z"
    })
    @IsDate()
    @IsOptional()
    @Type(() => Date)
    birthDate?: Date;

    @ApiPropertyOptional({
        description: "Avatar URL",
        example: "https://cdn.example.com/avatars/me.jpg"
    })
    @IsUrl({ require_tld: false })
    @IsOptional()
    avatar?: string;

    @ApiPropertyOptional({
        description: "Profile photo URLs",
        type: [String],
        example: ["https://cdn.example.com/photos/1.jpg"]
    })
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    photos?: string[];

    @ApiPropertyOptional({
        description: "Gender preference",
        enum: GenderPreference,
        example: GenderPreference.BOTH
    })
    @IsEnum(GenderPreference)
    @IsOptional()
    genderPreference?: GenderPreference;

    @ApiPropertyOptional({
        description: "User bio",
        example: "Love traveling and coffee."
    })
    @IsString()
    @IsOptional()
    bio?: string;

    @ApiPropertyOptional({
        description: "Job title",
        example: "Product Designer"
    })
    @IsString()
    @IsOptional()
    jobTitle?: string;

    @ApiPropertyOptional({
        description: "Company name",
        example: "Acme Corp"
    })
    @IsString()
    @IsOptional()
    company?: string;

    @ApiPropertyOptional({
        description: "School name",
        example: "HCMUT"
    })
    @IsString()
    @IsOptional()
    school?: string;
}
