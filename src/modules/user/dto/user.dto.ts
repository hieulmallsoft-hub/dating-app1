import {
    IsString,
    IsEmail,
    IsNotEmpty,
    IsEnum,
    IsOptional,
    IsNumber,
    MinLength,
    MaxLength,
    IsDateString
} from "class-validator";

export enum Gender {
    MALE = "male",
    FEMALE = "female",
    OTHER = "other"
}

export class RegisterDto {
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    password: string;

    @IsString()
    @IsOptional()
    fullName?: string;

    @IsEnum(Gender)
    @IsOptional()
    gender?: Gender;
}

export class LoginDto {
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    password: string;
}

export class UserDto {
    @IsNumber()
    id: number;

    @IsEmail()
    email: string;

    @IsString()
    @IsOptional()
    fullName?: string;

    @IsEnum(Gender)
    @IsOptional()
    gender?: Gender;

    @IsDateString()
    createdAt: Date;

    @IsDateString()
    updatedAt: Date;
}
