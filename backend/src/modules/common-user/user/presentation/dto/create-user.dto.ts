import {
    IsString,
    IsEmail,
    IsDate,
    IsEnum,
    IsArray,
    IsBoolean,
    IsNotEmpty,
    IsOptional
} from "class-validator";
import { Type } from "class-transformer";
import { Gender, GenderPreference } from "../../domain/entities/user.entity";

export class CreateUserDto {
    @IsString()
    @IsOptional()
    fullName?: string;

    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsOptional()
    password?: string;

    @IsString()
    @IsOptional()
    phoneNumber?: string;

    @IsDate()
    @IsOptional()
    @Type(() => Date)
    birthDate?: Date;

    @IsEnum(Gender)
    @IsOptional()
    gender?: Gender;

    @IsEnum(GenderPreference)
    @IsOptional()
    genderPreference?: GenderPreference;

    @IsString()
    @IsOptional()
    bio?: string;

    @IsArray()
    @IsOptional()
    photos?: string[];

    @IsString()
    @IsOptional()
    avatar?: string;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;

    @IsBoolean()
    @IsOptional()
    isPremium?: boolean;

    @IsDate()
    @IsOptional()
    @Type(() => Date)
    lastActiveAt?: Date;
}
