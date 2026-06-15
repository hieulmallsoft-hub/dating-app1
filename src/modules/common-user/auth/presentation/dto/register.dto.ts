import {
    IsDate,
    IsEmail,
    IsIn,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUrl
} from "class-validator";
import { Transform, Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Gender } from "../../../user/domain/entities/user.entity";
import { toGenderEnum } from "../../../user/presentation/mappers/gender.mapper";

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
        description: "User gender code: 0=MALE, 1=FEMALE, 2=OTHER",
        type: Number,
        enum: [0, 1, 2],
        example: 1
    })
    @Transform(({ value }) => toGenderEnum(value))
    @IsIn([Gender.MALE, Gender.FEMALE, Gender.OTHER])
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
