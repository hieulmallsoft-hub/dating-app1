import { IsString, IsEmail, IsDate, IsEnum, IsArray, IsNumber, IsBoolean, IsNotEmpty, IsOptional } from 'class-validator';
import { Gender, GenderPreference } from '../../domain/entities/users.model';

export class CreateUserDto {
    @IsString()
    @IsOptional()
    fullName?: string;

    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    password: string;

    @IsString()
    @IsOptional()
    phoneNumber?: string;

    @IsDate()
    @IsOptional()
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
    lastActiveAt?: Date;

}