import { IsString, IsOptional, IsEnum, IsDate, MaxLength, IsArray, IsUrl } from "class-validator";
import { Type } from "class-transformer";
import { Gender, GenderPreference } from "../../domain/entities/users.enity";

export class UpdateUserDto {
    @IsString()
    @IsOptional()
    @MaxLength(15)
    fullName?: string;

    @IsEnum(Gender)
    @IsOptional()
    gender?: Gender;

    @IsDate()
    @IsOptional()
    @Type(() => Date)
    birthDate?: Date;

    @IsUrl({ require_tld: false })
    @IsOptional()
    avatar?: string;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    photos?: string[];

    @IsEnum(GenderPreference)
    @IsOptional()
    genderPreference?: GenderPreference;

    @IsString()
    @IsOptional()
    bio?: string;

    @IsString()
    @IsOptional()
    jobTitle?: string;

    @IsString()
    @IsOptional()
    company?: string;

    @IsString()
    @IsOptional()
    school?: string;
}
