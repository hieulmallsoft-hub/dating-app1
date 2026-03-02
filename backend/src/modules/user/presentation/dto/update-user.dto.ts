import { IsString, IsOptional, IsEnum, IsDateString, MaxLength, IsArray, IsUrl } from "class-validator";
import { Gender, GenderPreference } from "../../domain/entities/users.enity";

export class UpdateUserDto {
    @IsString()
    @IsOptional()
    @MaxLength(15)
    fullName?: string;

    @IsEnum(Gender)
    @IsOptional()
    gender?: Gender;

    @IsDateString()
    @IsOptional()
    birthDate?: string;

    @IsUrl()
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
