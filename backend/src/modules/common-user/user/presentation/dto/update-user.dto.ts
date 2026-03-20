import { IsString, IsOptional, IsDate, MaxLength, IsIn } from "class-validator";
import { Transform, Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Gender } from "../../domain/entities/user.entity";
import { toGenderEnum } from "../mappers/gender.mapper";

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
        description: "Gender code: 0=MALE, 1=FEMALE, 2=OTHER",
        type: Number,
        enum: [0, 1, 2],
        example: 1
    })
    @Transform(({ value }) => toGenderEnum(value))
    @IsIn([Gender.MALE, Gender.FEMALE, Gender.OTHER])
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
        description:
            "Avatar value. For mobile, use multipart/form-data with file field `avatar` on PATCH /profile or PATCH /users/me.",
        example: "upload-via-multipart-file"
    })
    @IsString()
    @IsOptional()
    avatar?: string;

}
