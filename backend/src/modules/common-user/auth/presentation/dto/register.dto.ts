import {
    IsDate,
    IsEmail,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    MinLength
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Gender } from "../../../user/domain/entities/users.enity";

export class RegisterDto {
    @ApiProperty({
        description: "Email for account registration",
        example: "mobile.user@example.com"
    })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiPropertyOptional({
        description: "Password for local login (min 6 chars). Optional for social-first accounts.",
        example: "123456"
    })
    @IsString()
    @IsOptional()
    @MinLength(6)
    password?: string;

    @ApiPropertyOptional({
        description: "Display name",
        example: "Mobile User"
    })
    @IsString()
    @IsOptional()
    fullName?: string;

    @ApiProperty({
        description: "User gender",
        enum: Gender,
        example: Gender.FEMALE
    })
    @IsEnum(Gender)
    @IsNotEmpty()
    gender: Gender;

    @ApiProperty({
        description: "Birth date (YYYY-MM-DD)",
        example: "2001-05-07"
    })
    @Type(() => Date)
    @IsDate()
    @IsNotEmpty()
    birthDate: Date;
}
