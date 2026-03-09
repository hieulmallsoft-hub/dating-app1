import {
    IsDate,
    IsEmail,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUrl
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Gender } from "../../../user/domain/entities/user.entity";

export class RegisterDto {
    @ApiProperty({
        description: "Email for account registration",
        example: "mobile.user@example.com"
    })
    @IsEmail()
    @IsNotEmpty()
    email: string;

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

    @ApiPropertyOptional({
        description: "Avatar URL",
        example: "https://cdn.example.com/avatars/me.jpg"
    })
    @IsOptional()
    @IsString()
    @IsUrl()
    avatar?: string;
}
